/**
 * roles.ts — словарь ролей материалов для казённых предметов каталога.
 *
 * Предмет называет, ИЗ ЧЕГО сделана каждая деталь, одним словом из этого
 * словаря: `paint` (крашеный металл или дерево), `steel`, `enamel`, `glass`...
 * Мир подменяет роли своими материалами (`mats`), и одна подмена сразу
 * перекрашивает все предметы комнаты: шкафчик, койка и огнетушитель берут
 * один `paint`, если мир так решил.
 *
 * Роль вне словаря - ошибка: мир не узнает, что ей подменить, и деталь
 * молча уедет в набор по умолчанию. Поэтому словарь закрытый, а проверка
 * предметов (`worlds/props.ts` в наборе проверки витрины) ловит роль, которой
 * в нём нет.
 *
 * У каждой роли есть набор ядра по умолчанию - для мира, который ничего не
 * подменил. Светящиеся роли (`tube`, `bulb`, `screen`, `dial`, `led`,
 * `shade`) получают эмиссию, прозрачные (`glass`, `water`) - прозрачность.
 * Новых наборов карт роли не заводят: всё из рецептов ядра.
 */
import * as THREE from 'three';
import type { MaterialOptions } from '../materials/index.js';
import { type Mats } from './look.js';
/** Роль по умолчанию: набор ядра, его настройки и, если нужно, прозрачность. */
export type RoleDefault = {
    set: string;
    o: MaterialOptions;
    /** Прозрачность для стекла и воды. */
    opacity?: number;
    /**
     * Пишет ли глубину. Прозрачное (стекло, вода) - нет: оно ложится поверх уже
     * нарисованного, как у three и принято для прозрачных материалов, и за
     * глубину с соседней гранью не спорит. Проверка предметов берёт этот
     * признак отсюда же.
     */
    depthWrite?: boolean;
};
export declare const ROLES: {
    /** Крашеное: металл шкафчика, рама койки, корпус щита. */
    paint: {
        set: string;
        o: {
            color: number;
            normalScale: number;
            roughness: number;
        };
    };
    /** Вторая краска того же предмета: крест на аптечке, кант, ручка. */
    paint2: {
        set: string;
        o: {
            color: number;
            normalScale: number;
            roughness: number;
        };
    };
    steel: {
        set: string;
        o: {
            color: number;
            normalScale: number;
        };
    };
    rust: {
        set: string;
        o: {
            color: number;
            normalScale: number;
        };
    };
    wood: {
        set: string;
        o: {
            color: number;
            normalScale: number;
        };
    };
    cloth: {
        set: string;
        o: {
            color: number;
            normalScale: number;
        };
    };
    rubber: {
        set: string;
        o: {
            color: number;
            normalScale: number;
            roughness: number;
        };
    };
    glass: {
        set: string;
        o: {
            color: number;
            normalScale: number;
            roughness: number;
        };
        opacity: number;
        depthWrite: false;
    };
    water: {
        set: string;
        o: {
            color: number;
            normalScale: number;
            roughness: number;
        };
        opacity: number;
        depthWrite: false;
    };
    enamel: {
        set: string;
        o: {
            color: number;
            normalScale: number;
            roughness: number;
            metalness: number;
        };
    };
    paper: {
        set: string;
        o: {
            color: number;
            normalScale: number;
        };
    };
    /** Плоскость снимка: мир рисует на ней снимок сам, UV от 0 до 1. */
    photo: {
        set: string;
        o: {
            color: number;
            normalScale: number;
        };
    };
    plastic: {
        set: string;
        o: {
            color: number;
            normalScale: number;
            roughness: number;
        };
    };
    brass: {
        set: string;
        o: {
            color: number;
            normalScale: number;
        };
    };
    soil: {
        set: string;
        o: {
            color: number;
            normalScale: number;
        };
    };
    leaf: {
        set: string;
        o: {
            color: number;
            normalScale: number;
        };
    };
    fruit: {
        set: string;
        o: {
            color: number;
            normalScale: number;
            roughness: number;
        };
    };
    /** Люминесцентная трубка, фитолампа. */
    tube: {
        set: string;
        o: {
            color: number;
            normalScale: number;
            emissive: number;
            emissiveIntensity: number;
        };
    };
    bulb: {
        set: string;
        o: {
            color: number;
            normalScale: number;
            emissive: number;
            emissiveIntensity: number;
        };
    };
    screen: {
        set: string;
        o: {
            color: number;
            normalScale: number;
            emissive: number;
            emissiveIntensity: number;
        };
    };
    dial: {
        set: string;
        o: {
            color: number;
            normalScale: number;
            emissive: number;
            emissiveIntensity: number;
        };
    };
    led: {
        set: string;
        o: {
            color: number;
            normalScale: number;
            emissive: number;
            emissiveIntensity: number;
        };
    };
    /** Абажур, светящийся изнутри. */
    shade: {
        set: string;
        o: {
            color: number;
            normalScale: number;
            emissive: number;
            emissiveIntensity: number;
        };
    };
};
export type Role = keyof typeof ROLES;
/** Все роли словаря, по порядку. */
export declare const ROLE_NAMES: Role[];
/**
 * Материалы предмета по ролям: подмена мира, иначе набор ядра.
 *
 * Возвращает функцию роли с кэшем: деталей из крашеной стали у шкафчика
 * десяток, а материал на них один. `tint` - свой цвет по умолчанию у этого
 * предмета (огнетушитель красный, раковина белая); мир с подменой его не
 * увидит.
 */
export declare function roleMats(mats: Mats | undefined, tint?: Partial<Record<Role, number>>): (role: Role) => THREE.Material;
