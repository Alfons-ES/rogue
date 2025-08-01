import { Engine } from './engine';
import { Entity, Actor } from './entity';

export interface Action {
    perform: (entity: Entity) => void;
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
    perform(entity: Entity) { // Check if the entity can move in the specified direction
        const destX = entity.x + this.dx;
        const destY = entity.y + this.dy;

        if (!window.engine.gameMap.isInBounds(destX, destY)) return;
        if (!window.engine.gameMap.tiles[destY][destX].walkable) return;
        if (window.engine.gameMap.getBlockingEntityAtLocation(destX, destY)) return; // Check if there's an entity blocking the movement
        entity.move(this.dx, this.dy);
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

        if (damage > 0) {
            console.log(`${attackDescription} for ${damage} hit points.`);
            target.fighter.hp -= damage; //apply damage to target
        } else {
            console.log(`${attackDescription} but does no damage.`);
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
    Period: new BumpAction(0, 0), // Wait action
};

export function handleInput(event: KeyboardEvent): Action {
    return MOVE_KEYS[event.key];
}