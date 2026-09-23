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

import * as THREE from 'three'
import type { MaterialOptions } from '../materials/index.js'
import { lookOf, type Mats } from './look.js'

/** Роль по умолчанию: набор ядра, его настройки и, если нужно, прозрачность. */
export type RoleDefault = {
  set: string
  o: MaterialOptions
  /** Прозрачность для стекла и воды. */
  opacity?: number
  /**
   * Пишет ли глубину. Прозрачное (стекло, вода) - нет: оно ложится поверх уже
   * нарисованного, как у three и принято для прозрачных материалов, и за
   * глубину с соседней гранью не спорит. Проверка предметов берёт этот
   * признак отсюда же.
   */
  depthWrite?: boolean
}

export const ROLES = {
  /** Крашеное: металл шкафчика, рама койки, корпус щита. */
  paint: { set: 'surfaceRust', o: { color: 0x6f8a7e, normalScale: 0.35, roughness: 0.75 } },
  /** Вторая краска того же предмета: крест на аптечке, кант, ручка. */
  paint2: { set: 'surfaceRust', o: { color: 0x9a2b22, normalScale: 0.35, roughness: 0.7 } },
  steel: { set: 'surfaceMetal', o: { color: 0xa9adb1, normalScale: 0.5 } },
  rust: { set: 'surfaceRust', o: { color: 0x7b4a2c, normalScale: 1 } },
  wood: { set: 'surfaceWood', o: { color: 0xa47b52, normalScale: 0.8 } },
  cloth: { set: 'surfaceCloth', o: { color: 0x8c8672, normalScale: 0.8 } },
  rubber: { set: 'leather', o: { color: 0x2a2a28, normalScale: 0.5, roughness: 0.85 } },
  glass: { set: 'surfaceIce', o: { color: 0xd8e6e8, normalScale: 0.1, roughness: 0.05 }, opacity: 0.3, depthWrite: false },
  water: { set: 'surfaceIce', o: { color: 0x4d5a50, normalScale: 0.2, roughness: 0.05 }, opacity: 0.8, depthWrite: false },
  enamel: { set: 'surfaceMetal', o: { color: 0xeeeeea, normalScale: 0.2, roughness: 0.3, metalness: 0 } },
  paper: { set: 'surfacePaper', o: { color: 0xece6d6, normalScale: 0.6 } },
  /** Плоскость снимка: мир рисует на ней снимок сам, UV от 0 до 1. */
  photo: { set: 'surfacePaper', o: { color: 0x8a8580, normalScale: 0.3 } },
  plastic: { set: 'surfaceConcrete', o: { color: 0x7a6a5a, normalScale: 0.2, roughness: 0.6 } },
  brass: { set: 'surfaceMetal', o: { color: 0xc8a050, normalScale: 0.4 } },
  soil: { set: 'surfaceGravel', o: { color: 0x4a3a2a, normalScale: 1 } },
  leaf: { set: 'surfaceCloth', o: { color: 0x3f6a2a, normalScale: 0.3 } },
  fruit: { set: 'surfacePaper', o: { color: 0xc0281a, normalScale: 0.1, roughness: 0.35 } },
  /** Люминесцентная трубка, фитолампа. */
  tube: { set: 'surfacePaper', o: { color: 0xffffff, normalScale: 0, emissive: 0xf0f4ff, emissiveIntensity: 1.2 } },
  bulb: { set: 'surfacePaper', o: { color: 0xffffff, normalScale: 0, emissive: 0xffd9a0, emissiveIntensity: 1.2 } },
  screen: { set: 'surfacePaper', o: { color: 0x113311, normalScale: 0, emissive: 0x33ff66, emissiveIntensity: 0.8 } },
  dial: { set: 'surfacePaper', o: { color: 0xf4e8c8, normalScale: 0.2, emissive: 0xffc070, emissiveIntensity: 0.6 } },
  led: { set: 'surfacePaper', o: { color: 0x330000, normalScale: 0, emissive: 0xff2010, emissiveIntensity: 1.5 } },
  /** Абажур, светящийся изнутри. */
  shade: { set: 'surfaceCloth', o: { color: 0xe8dcc0, normalScale: 0.4, emissive: 0xffc890, emissiveIntensity: 0.4 } },
} satisfies Record<string, RoleDefault>

export type Role = keyof typeof ROLES

/** Все роли словаря, по порядку. */
export const ROLE_NAMES = Object.keys(ROLES) as Role[]

/**
 * Материалы предмета по ролям: подмена мира, иначе набор ядра.
 *
 * Возвращает функцию роли с кэшем: деталей из крашеной стали у шкафчика
 * десяток, а материал на них один. `tint` - свой цвет по умолчанию у этого
 * предмета (огнетушитель красный, раковина белая); мир с подменой его не
 * увидит.
 */
export function roleMats(mats: Mats | undefined, tint: Partial<Record<Role, number>> = {}): (role: Role) => THREE.Material {
  const cache = new Map<Role, THREE.Material>()
  return (role) => {
    let m = cache.get(role)
    if (m) return m
    const own = mats?.[role]
    if (own) m = own
    else {
      const d: RoleDefault = ROLES[role]
      const o = tint[role] !== undefined ? { ...d.o, color: tint[role] } : d.o
      m = lookOf(undefined, role, d.set, o)
      if (d.opacity !== undefined) {
        m.transparent = true
        m.opacity = d.opacity
      }
      if (d.depthWrite === false) m.depthWrite = false
    }
    cache.set(role, m)
    return m
  }
}
