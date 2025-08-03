import { BaseAI, HostileEnemy } from './components/ai';
import { Fighter } from './components/fighter';
import { GameMap } from './game-map';

export enum RenderOrder { // Order
    Corpse,
    Item,
    Actor,
}
export class Entity {
  constructor(
    public x: number,
    public y: number,
    public char: string,
    public fg: string = '#fff',
    public bg: string = '#000',
    public name: string = '<Unnamed>',
    public blocksMovement: boolean = false,
      public renderOrder: RenderOrder = RenderOrder.Corpse,
      public parent: GameMap | null = null,
    ) {
        if (this.parent) {
            this.parent.entities.push(this);
        }
    }
    public get gameMap(): GameMap | undefined {
        return this.parent?.gameMap;
    }

    move(dx: number, dy: number) {
        this.x += dx;
        this.y += dy;
    }
}

export class Actor extends Entity {
    constructor(
        public x: number,
        public y: number,
        public char: string,
        public fg: string = '#fff',
        public bg: string = '#000',
        public name: string = '<Unnamed>',
        public ai: BaseAI | null,
        public fighter: Fighter,
        public parent: GameMap | null = null,
    ) {
        super(x, y, char, fg, bg, name, true, RenderOrder.Actor, parent);
        this.fighter.parent = this;
    }

    public get isAlive(): boolean {
        return !!this.ai || window.engine.player === this;
    }
}

export function spawnPlayer(x: number, y: number): Actor {
    return new Actor(
        x,
        y,
        '🧝🏻',
        '#000',
        '#0287cf',
        'Player',
        null,
        new Fighter(100, 2, 5),
    );
}

export function spawnOrc(x: number, y: number): Entity {
    return new Actor(
        x,
        y,
        '🧟',
        '#000',
        '#c90a0a',
        'Orc',
        new HostileEnemy(),
        new Fighter(10, 0, 3),
    );
}

export function spawnTroll(x: number, y: number): Entity {
    return new Actor(
        x,
        y,
        '🧌',
        '#000',
        '#c90a0a',
        'Troll',
        new HostileEnemy(),
        new Fighter(16, 1, 4),
    );
}
