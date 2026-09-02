import * as THREE from 'three';
/**
 * Тело игрока от первого лица: намерение в скорость, гравитация, прыжок,
 * выносливость, качка, шаги, приземление.
 *
 * ТЕЛО И КАМЕРА РАЗДЕЛЕНЫ. Физика двигает `pos` (ступни), камера каждый кадр
 * выводится из `pos` (глаз + качка + сглаживание ступенек). Раньше физика
 * гоняла `camera.position` напрямую, и боковая качка интегрировалась в
 * позицию: вид «плавал», а визуальные сдвиги протекали в коллизии.
 *
 * ГЕОМЕТРИИ ТЕЛО НЕ ЗНАЕТ ВОВСЕ. Всё, что связано с формой мира, приходит
 * через `Support`: где пол, куда вытолкнуть, далеко ли до стены. Тело умеет
 * ходить по чему угодно, что умеет ответить на эти три вопроса, - по
 * воксельному срезу с деревянным полом поверх (Snowfall) ровно так же, как по
 * капсуле в octree.
 *
 * Все авторские числа вынесены в опции. Умолчания - числа Snowfall, снятые с
 * рабочей игры: менять их значит менять походку, а не настройку.
 */
const clamp = THREE.MathUtils.clamp;
const STAMINA = {
    drain: 1 / 11,
    gainIdle: 1 / 9,
    gainWalk: 1 / 20,
    recover: 0.3,
    runAt: 0.02,
    jumpCost: 0.06,
};
export class Body {
    camera;
    input;
    support;
    onStep;
    onLand;
    /** Мировая позиция СТУПНЕЙ. */
    pos;
    vel = new THREE.Vector3();
    vy = 0;
    grounded = true;
    /** На чём стоим. Липкое: в воздухе не мигает. */
    surface = 'snow';
    /** сколько секунд без опоры (coyote-прыжок, устойчивость состояний) */
    airT = 0;
    /** затухающий сдвиг вида для сглаживания ступенек */
    viewOffsetY = 0;
    /**
     * Высота, на которой тело держится, пока настоящей опоры под ним ещё нет.
     * null - держать не надо.
     */
    holdY = null;
    bobT = 0;
    bobAmt = 0;
    stride = 0;
    side = 1;
    stamina = 1;
    exhausted = false;
    exertion = 0;
    running = false;
    moving = false;
    /** Груз в руках: медленнее, бег недоступен, прыжок тяжелее. */
    carrying = false;
    /** Множители под груз - мир решает, чем именно заняты руки. */
    carrySpeed = 0.8;
    carryJump = 0.7;
    carryJumpCost = 0.1;
    eye;
    height;
    radius;
    walk;
    runSpeed;
    bounds;
    gravity;
    jumpSpeed;
    stepUp;
    stepDown;
    fallProbe;
    coyote;
    accel;
    viewSmooth;
    moveAt;
    bobWalk;
    bobRun;
    bobRate;
    bobEase;
    strideWalk;
    strideRun;
    stepAhead;
    stepSide;
    landAt;
    fov;
    fovRun;
    fovRate;
    st;
    nearFar;
    nearHug;
    nearEngage;
    nearRate;
    clearEps;
    clearStep;
    _fwd = new THREE.Vector3();
    _right = new THREE.Vector3();
    _wish = new THREE.Vector3();
    _dir = new THREE.Vector3(0, 0, -1);
    _eye = new THREE.Vector3();
    _jumpHeld = false;
    constructor(o) {
        this.camera = o.camera;
        this.input = o.input;
        this.support = o.support;
        this.onStep = o.onStep;
        this.onLand = o.onLand;
        this.eye = o.eye ?? 1.7;
        this.height = o.height ?? 1.7;
        this.radius = o.radius ?? 0.35;
        // Темп вдвое ниже спринтерского: шаг по целине неспешный (человеческий
        // прогулочный), бег - трусца. Мир маленький, спешить некуда.
        this.walk = o.walk ?? 1.5;
        this.runSpeed = o.run ?? 3.0;
        this.bounds = o.bounds === undefined ? 72 : o.bounds;
        this.gravity = o.gravity ?? 24;
        this.jumpSpeed = o.jump ?? 6.3; // ≈0.8 м над землёй
        this.stepUp = o.stepUp ?? 0.55;
        this.stepDown = o.stepDown ?? 0.45;
        this.fallProbe = o.fallProbe ?? 4.0;
        this.coyote = o.coyote ?? 0.12;
        this.accel = o.accel ?? 7.5;
        this.viewSmooth = o.viewSmooth ?? 14;
        this.moveAt = o.moveAt ?? 0.35;
        this.bobWalk = o.bobWalk ?? 0.045;
        this.bobRun = o.bobRun ?? 0.075;
        this.bobRate = o.bobRate ?? 1.95;
        this.bobEase = o.bobEase ?? 6;
        this.strideWalk = o.strideWalk ?? 0.92;
        this.strideRun = o.strideRun ?? 1.5;
        this.stepAhead = o.stepAhead ?? 0.3;
        this.stepSide = o.stepSide ?? 0.17;
        this.landAt = o.landAt ?? -3.2;
        this.fov = o.fov ?? 75;
        this.fovRun = o.fovRun ?? 81;
        this.fovRate = o.fovRate ?? 5;
        this.st = { ...STAMINA, ...o.stamina };
        this.nearFar = o.near ?? 0.1; // near вдали от стен
        this.nearHug = o.nearHug ?? 0.05; // near вплотную к стене
        this.nearEngage = o.nearEngage ?? 0.75; // с какого расстояния до стены сужаем
        this.nearRate = o.nearRate ?? 18;
        this.clearEps = o.clearEps ?? 0.02;
        this.clearStep = o.clearStep ?? 0.5;
        this.pos = o.spawn.clone();
        this.camera.position.set(this.pos.x, this.pos.y + this.eye, this.pos.z);
    }
    /** В мире ли мы: курсор захвачен, играем пальцем или взят режим без захвата. */
    get locked() {
        return this.input.locked;
    }
    /** Остановить тело насовсем: игрок замёрз, упал, вышел. */
    halt() {
        this.input.halt();
    }
    /**
     * Поставить камеру туда, где стоит тело, не трогая физику.
     *
     * Нужен там, где мир переносит тело сам (сейв вернул игрока на прежнее
     * место), а `update` в этот момент не зовётся: без этой строки вернувшийся
     * весь вход смотрел бы из точки старта, а на последнем кадре появления его
     * переносило бы к сейву - это и ощущается телепортом.
     */
    syncCamera() {
        this.camera.position.set(this.pos.x, this.pos.y + this.eye, this.pos.z);
    }
    /**
     * Анти-просвет за стену. Тело держит лишь ГОРИЗОНТАЛЬНЫЙ зазор, а near-угол,
     * качка и верхние кромки выступают за грунт. Камеру трактуем как сферу
     * радиуса R (дальний угол near-плоскости) и держим в воздухе; у стены
     * дополнительно сужаем near, чтобы сфера была меньше и к забою можно было
     * подойти вплотную. Работает поверх физики - на движение не влияет.
     */
    _shieldView(dt) {
        if (!this.support.clearance)
            return;
        const cam = this.camera;
        let c = this.support.clearance(cam.position);
        if (!c) {
            // миру нечего прятать - near как обычно
            if (cam.near !== this.nearFar) {
                cam.near = this.nearFar;
                cam.updateProjectionMatrix();
            }
            return;
        }
        // у стены жмём near - near-плоскость (и сфера R) меньше, к забою подходим вплотную
        const k = clamp(Math.max(0, c.dist) / this.nearEngage, 0, 1);
        const targetNear = this.nearHug + (this.nearFar - this.nearHug) * k;
        const newNear = targetNear + (cam.near - targetNear) * Math.exp(-this.nearRate * dt);
        if (Math.abs(cam.near - newNear) > 1e-4) {
            cam.near = newNear;
            cam.updateProjectionMatrix();
        }
        // радиус защитной сферы = дальний угол near-плоскости от глаза + запас
        const halfH = cam.near * Math.tan(THREE.MathUtils.degToRad(cam.fov) * 0.5);
        const halfW = halfH * cam.aspect;
        const R = Math.hypot(cam.near, halfH, halfW) + this.clearEps;
        let cx = cam.position.x;
        let cy = cam.position.y;
        let cz = cam.position.z;
        for (let it = 0; it < 2; it++) {
            if (it > 0) {
                // пересэмплим в новой точке - точнее второй ньютоновский шаг
                c = this.support.clearance(this._eye.set(cx, cy, cz));
                if (!c)
                    break;
            }
            if (c.dist >= R)
                break; // уже достаточно в воздухе
            const len = Math.min(R - c.dist, this.clearStep); // клэмп скачка за кадр
            cx += c.normal.x * len;
            cy += c.normal.y * len;
            cz += c.normal.z * len;
        }
        cam.position.set(cx, cy, cz);
    }
    update(dt) {
        const cam = this.camera;
        const pos = this.pos;
        const B = this.bounds;
        const intent = this.input.update(dt);
        // направление взгляда в плоскости XZ
        this._fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
        this._fwd.y = 0;
        // Запасной вариант на вырожденный взгляд (строго в зенит или в надир).
        // Раньше здесь стоял ФИКСИРОВАННЫЙ вектор −Z, и движение прыгало на север
        // независимо от того, куда игрок повёрнут. Берём курс из самого взгляда:
        // он верен всегда.
        if (this._fwd.lengthSq() < 1e-6) {
            const y = this.input.look.yaw;
            this._fwd.set(-Math.sin(y), 0, -Math.cos(y));
        }
        this._fwd.normalize();
        this._right.crossVectors(this._fwd, cam.up).normalize();
        const f = intent.move.y;
        const r = intent.move.x;
        const running = intent.run &&
            f > 0 &&
            !this.exhausted &&
            this.stamina > this.st.runAt &&
            !this.carrying;
        this._wish.set(0, 0, 0);
        if (this.locked && (f || r)) {
            // аналоговая длина сохраняется (тач: лёгкий увод пальца = медленный шаг),
            // клавиши дают длину ≥1 и нормализуются
            this._wish.addScaledVector(this._fwd, f).addScaledVector(this._right, r);
            const wl = this._wish.length();
            this._wish.multiplyScalar(((Math.min(1, wl) / wl) *
                (running ? this.runSpeed : this.walk) *
                (this.carrying ? this.carrySpeed : 1)));
        }
        // инерция (снег вязкий - разгон и торможение плавные)
        this.vel.lerp(this._wish, 1 - Math.exp(-this.accel * dt));
        // Куда тело ХОТЕЛО прийти за этот кадр. Запоминаем, чтобы ниже сверить с
        // тем, куда оно пришло на самом деле, и вернуть скорости честность.
        const wantX = pos.x + this.vel.x * dt;
        const wantZ = pos.z + this.vel.z * dt;
        pos.x = B === null ? wantX : clamp(wantX, -B, B);
        pos.z = B === null ? wantZ : clamp(wantZ, -B, B);
        // мир выталкивает тело из твёрдого: стены пещер, стволы, мебель, дверь
        this.support.resolve(pos, this.radius, this.height, this.vel, dt);
        if (B !== null) {
            pos.x = clamp(pos.x, -B, B);
            pos.z = clamp(pos.z, -B, B);
        }
        // СКОРОСТЬ ДОЛЖНА ЗНАТЬ ПРО СТЕНУ. Выталкивание двигает позицию и не трогает
        // vel, а по vel считается всё остальное: шаги, качка головы, крен камеры на
        // стрейфе, направление следов. Упёршись в ствол, тело стояло на месте, а в
        // числах продолжало идти: замер показал 0.000 м пройденного пути за три
        // секунды при скорости 1.5 м/с, полной качке и пяти прозвучавших шагах.
        //
        // Гасим ровно составляющую скорости, направленную В поверхность: суммарное
        // выталкивание за кадр и есть её нормаль. Вдоль стены движение остаётся.
        const blockX = pos.x - wantX;
        const blockZ = pos.z - wantZ;
        const blockLen = Math.hypot(blockX, blockZ);
        if (blockLen > 1e-6) {
            const nx = blockX / blockLen;
            const nz = blockZ / blockLen;
            const into = this.vel.x * nx + this.vel.z * nz;
            if (into < 0) {
                this.vel.x -= nx * into;
                this.vel.z -= nz * into;
            }
        }
        const speed = Math.hypot(this.vel.x, this.vel.z);
        const moving = speed > this.moveAt;
        this.moving = moving;
        this.running = running && moving;
        // выносливость: бег тратит, отдых восстанавливает
        const st = this.st;
        if (this.running)
            this.stamina = Math.max(0, this.stamina - dt * st.drain);
        else
            this.stamina = Math.min(1, this.stamina + dt * (moving ? st.gainWalk : st.gainIdle));
        if (this.stamina <= 0)
            this.exhausted = true;
        else if (this.exhausted && this.stamina > st.recover)
            this.exhausted = false;
        // «запыхавшесть» - растёт на бегу, спадает медленно (частота дыхания)
        if (this.running)
            this.exertion = Math.min(1, this.exertion + dt / 8);
        else
            this.exertion = Math.max(0, this.exertion - dt / 20);
        // качка головы
        const targetBob = moving ? (running ? this.bobRun : this.bobWalk) : 0;
        this.bobAmt += (targetBob - this.bobAmt) * Math.min(1, this.bobEase * dt);
        if (moving)
            this.bobT += dt * speed * this.bobRate;
        const bobY = Math.sin(this.bobT * 2.0) * this.bobAmt;
        const bobX = Math.cos(this.bobT) * this.bobAmt * 0.55;
        // --- вертикаль: гравитация и опора, которую называет мир ---
        const floor = this.support.floorAt(pos.x, pos.z, pos.y + this.stepUp, this.stepUp + this.fallProbe);
        let ground = floor ? floor.y : null;
        const surface = floor ? floor.surface : this.surface;
        // Опора, которой ещё нет. Мир может доезжать по сети уже после старта, а
        // сейв возвращает игрока туда, где он вышел, - может быть, и на пол
        // недоехавшей постройки. Между этими двумя моментами пола под ногами
        // физически нет, и без оговорки вернувшийся встречал бы мир падением:
        // удар, звук, клевок камеры, - а через секунду его поднимало бы обратно
        // приехавшим полом.
        //
        // Поэтому пока мир доезжает, тело держится на той высоте, на которой
        // стояло. Оговорка снимается сама, как только под ногами окажется
        // настоящая опора не ниже этой.
        if (this.holdY !== null) {
            if (ground !== null && ground >= this.holdY - 0.02)
                this.holdY = null;
            else
                ground = Math.max(ground ?? -Infinity, this.holdY);
        }
        // прыжок: с опоры или в пределах coyote-грации (истощённый - нет)
        const wasAirborne = !this.grounded;
        const wantJump = intent.jump;
        const canJump = this.grounded || (this.airT < this.coyote && this.vy <= 0);
        if (wantJump && !this._jumpHeld && canJump && this.locked && !this.exhausted) {
            // с грузом в руках толчок слабее и дороже - прыжок тяжёлый, а не бодрый
            this.vy = this.jumpSpeed * (this.carrying ? this.carryJump : 1);
            this.grounded = false;
            this.airT = this.coyote; // прыжок съедает грацию - двойного прыжка нет
            this.stamina = Math.max(0, this.stamina - (this.carrying ? this.carryJumpCost : st.jumpCost));
        }
        this._jumpHeld = wantJump;
        const wasGrounded = this.grounded;
        const prevFootY = pos.y; // для сглаживания ступенек: скачок опоры за кадр
        this.vy -= this.gravity * dt;
        const impactVy = this.vy; // вертикальная скорость к моменту касания
        let nextY = pos.y + this.vy * dt;
        this.grounded = false;
        if (ground !== null) {
            if (nextY <= ground + 0.02) {
                nextY = ground;
                this.vy = 0;
                this.grounded = true; // приземлились / стоим
            }
            else if (wasGrounded && this.vy <= 0 && ground >= nextY - this.stepDown) {
                nextY = ground;
                this.vy = 0;
                this.grounded = true; // прилипаем при спуске
            }
        }
        pos.y = nextY;
        this.airT = this.grounded ? 0 : this.airT + dt;
        // на чём стоим - обновляем только с опоры: в полёте звук шагов и
        // приземления не мигает между поверхностями
        if (this.grounded)
            this.surface = surface;
        // Сглаживание ступенек: пока стоим на опоре, резкий скачок pos.y (порог,
        // уступ, кромка ямы, прилипание к склону) - это не свободное движение, а
        // защёлкивание. Прячем дельту в сдвиг вида и плавно догоняем - камера едет
        // ровно, а не телепортом. В воздухе не трогаем: взлёт и приземление должны
        // быть чёткими.
        if (this.grounded && wasGrounded) {
            this.viewOffsetY = clamp(this.viewOffsetY + (pos.y - prevFootY), -this.stepUp, this.stepUp);
        }
        this.viewOffsetY *= Math.exp(-this.viewSmooth * dt); // затухание к 0
        // приземление после прыжка или падения - глухой удар
        if (wasAirborne && this.grounded && impactVy < this.landAt && this.onLand) {
            this.onLand(pos.x, pos.z, this.surface, impactVy);
        }
        // камера - производная от тела: глаз + качка + сглаживание ступенек.
        // Качка больше НЕ копится в физической позиции.
        cam.position.set(pos.x + this._right.x * bobX * 0.4, pos.y + this.eye + bobY - this.viewOffsetY, pos.z + this._right.z * bobX * 0.4);
        // раскачка обзора при беге
        const targetFov = running && moving ? this.fovRun : this.fov;
        if (Math.abs(cam.fov - targetFov) > 0.05) {
            cam.fov += (targetFov - cam.fov) * Math.min(1, this.fovRate * dt);
            cam.updateProjectionMatrix();
        }
        // анти-просвет: не даём near-плоскости камеры залезть за грунт
        this._shieldView(dt);
        // шаги по пройденной дистанции
        if (moving) {
            this.stride += speed * dt;
            const strideLen = running ? this.strideRun : this.strideWalk;
            if (this.stride >= strideLen) {
                this.stride = 0;
                this.side *= -1;
                this._dir.copy(this.vel).normalize();
                const fx = pos.x + this._dir.x * this.stepAhead + this._right.x * this.side * this.stepSide;
                const fz = pos.z + this._dir.z * this.stepAhead + this._right.z * this.side * this.stepSide;
                this.onStep?.(fx, fz, this._dir, this.side, running, this.surface);
            }
        }
        else {
            this.stride = Math.min(this.stride, 0.4);
        }
    }
}
//# sourceMappingURL=body.js.map