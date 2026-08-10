/**
 * generators.ts — сами материалы.
 *
 * Перенесены из эталона `demo/cabin-fireplace.html` один в один по замыслу, но
 * не буква в букву по числам: почти каждый второй вызов шума в эталоне нарушал
 * договор о периоде (см. `noise.ts`), и карта не стыковалась сама с собой. В
 * тёмной хижине это не читалось - шов на стене выглядел ещё одним пятном
 * копоти. Здесь множители приведены к целым (для `|sin|` - к кратным половине,
 * у него период π, а не 2π), индексы ячеек заведены через `wrapi`, а
 * доказывает починку не глаз, а замер шва в `test/check.mjs`.
 *
 * Правки, которые изменили картинку, перечислены поимённо в README - молча
 * подкрученных чисел здесь нет.
 *
 * Все генераторы пишут в один и тот же `Px` (см. `bake.ts`): ни одного нового
 * объекта на пиксель.
 */
import type { Generator, Px } from './bake.js';
export declare const log: Generator;
export declare function rubble(warm: boolean): Generator;
export declare const hearth: Generator;
export declare function firebrick(sootRise?: number): Generator;
export declare const floor: Generator;
export declare const beam: Generator;
export declare const bark: Generator;
export declare const logEnd: Generator;
export declare const cloth: Generator;
export declare const iron: Generator;
export declare function ashlar(warm?: boolean): Generator;
/** В какие стороны карта стыкуется сама с собой. */
export type Tiling = 'both' | 'u' | 'v' | 'none';
export type Recipe = {
    /** Ключ набора. */
    name: string;
    /** Человеческое имя - для отчётов проверки. */
    title: string;
    size: number;
    normalStrength: number;
    tiles: Tiling;
    /** Почему не в обе стороны. Обязателен, если `tiles !== 'both'`. */
    why?: string;
    gen: Generator;
};
export declare const RECIPES: Recipe[];
/** Найти рецепт по имени. */
export declare function recipe(name: string): Recipe;
export type { Generator, Px };
