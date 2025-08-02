import { Engine } from './engine';
import { Entity, Actor } from './entity';
import { Colors } from './colors';
import { EngineState } from './engine';

export interface Action {
    perform: (entity: Entity) => void;
}
export class LogAction implements Action {
    perform(_entity: Entity) {
        window.engine.state = EngineState.Log;
    }
}
export abstract class ActionWithDirection implements Action {
    constructor(public dx: number, public dy: number) { }
    perform(_entity: Entity) { }
}

export class BumpAction extends ActionWithDirection {
    perform(entity: Entity) {
        const destX = entity.x + this.dx;
        const destY = entity.y + this.dy;

        if (window.engine.gameMap.getActorAtLocation(destX, destY)) { // If there's an entity at the destination, perform a melee action
            return new MeleeAction(this.dx, this.dy).perform(entity as Actor);
        } else { // Otherwise, perform a movement action
            return new MovementAction(this.dx, this.dy).perform(entity);
        }
    }
}

export class MovementAction extends ActionWithDirection {
    perform(entity: Entity) {
        const gameMap = window.engine.gameMap;

        const targetX = entity.x + this.dx;
        const targetY = entity.y + this.dy;

        if (!gameMap.isInBounds(targetX, targetY)) return;
        if (!gameMap.tiles[targetY][targetX].walkable) return;
        if (gameMap.getBlockingEntityAtLocation(targetX, targetY)) return;

        // Move player
        entity.move(this.dx, this.dy);

        // move camera
        if (entity === window.engine.player) {
            gameMap.cameraX = entity.x - Math.floor(gameMap.display.getOptions().width! / 2);
            gameMap.cameraY = entity.y - Math.floor(gameMap.display.getOptions().height! / 2);
        }
    }
}


export class MeleeAction extends ActionWithDirection {
    perform(actor: Actor) {
        const destX = actor.x + this.dx;
        const destY = actor.y + this.dy; //get destination

        const target = window.engine.gameMap.getActorAtLocation(destX, destY); //find target
        if (!target) return;

        const damage = actor.fighter.power - target.fighter.defense; //calculate damage
        const attackDescription = `${actor.name.toUpperCase()} attacks ${target.name
            }`;

        const fg =
            actor.name === 'Player' ? Colors.PlayerAttack : Colors.EnemyAttack;
        if (damage > 0) {
            window.engine.messageLog.addMessage(
                `${attackDescription} for ${damage} hit points.`,
                fg,
            );
            target.fighter.hp -= damage;
        } else {
            window.engine.messageLog.addMessage(
                `${attackDescription} but does no damage.`,
                fg,
            );
        }
    }
}


export class WaitAction implements Action {
    perform(_entity: Entity) { }
}

interface MovementMap {
    [key: string]: Action;
}

const MOVE_KEYS: MovementMap = {
    q: new BumpAction(-1, -1),
    w: new BumpAction(0, -1),
    e: new BumpAction(1, -1),
    x: new BumpAction(0, 1),
    s: new BumpAction(0, 1),
    a: new BumpAction(-1, 0),
    d: new BumpAction(1, 0),
    z: new BumpAction(-1, 1),
    c: new BumpAction(1, 1),
    '.': new WaitAction(), 
    v: new LogAction(),
};

export function handleGameInput(event: KeyboardEvent): Action {
    return MOVE_KEYS[event.key];
}
export function handleLogInput(event: KeyboardEvent): number {
    if (event.key === 'Home') {
        window.engine.logCursorPosition = 0;
        return 0;
    }
    if (event.key === 'End') {
        window.engine.logCursorPosition =
            window.engine.messageLog.messages.length - 1;
        return 0;
    }

    const scrollAmount = LOG_KEYS[event.key];

    if (!scrollAmount) {
        window.engine.state = EngineState.Game;
        return 0;
    }
    return scrollAmount;
}
interface LogMap {
    [key: string]: number;
}
const LOG_KEYS: LogMap = {
    ArrowUp: -1,
    ArrowDown: 1,
    PageDown: 10,
    PageUp: -10,
};