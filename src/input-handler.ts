
import { Actor, Entity, Item } from './entity';
import { Colors } from './colors';
import { EngineState } from './engine';

export interface Action {
    perform: (entity: Entity) => void;
}
export class PickupAction implements Action {
    perform(entity: Entity) {
        const consumer = entity as Actor;
        if (!consumer) return;

        const { x, y, inventory } = consumer;

        for (const item of window.engine.gameMap.items) {
            if (x === item.x && y == item.y) {
                if (inventory.items.length >= inventory.capacity) {
                    window.engine.messageLog.addMessage(
                        'Inventory is full.',
                        Colors.Impossible,
                    );
                    throw new Error('Inventory is full.');
                }

                window.engine.gameMap.removeEntity(item);
                item.parent = inventory;
                inventory.items.push(item);

                window.engine.messageLog.addMessage(`Picked up ${item.name}!`);
                return;
            }
        }

        window.engine.messageLog.addMessage(
            'There is nothing here to pick up.',
            Colors.Impossible,
        );
        throw new Error('There is nothing here to pick up.');
    }
}
export class ItemAction implements Action {
    constructor(public item: Item) { }

    perform(entity: Entity) {
        this.item.consumable.activate(this, entity);
    }
}
export class WaitAction implements Action {
    perform(_entity: Entity) { }
}

export abstract class ActionWithDirection implements Action {
    constructor(public dx: number, public dy: number) { }
    perform(_entity: Entity) { }
}

export class MovementAction extends ActionWithDirection {
    perform(entity: Entity) {
        const gameMap = window.engine.gameMap;

        const destX = entity.x + this.dx;
        const destY = entity.y + this.dy;

        if (!gameMap.isInBounds(destX, destY)) {
            window.engine.messageLog.addMessage(
                'That way is blocked.',
                Colors.Impossible,
            );
            throw new Error('That way is blocked.');
        }
        if (!gameMap.tiles[destY][destX].walkable) {
            window.engine.messageLog.addMessage(
                'That way is blocked.',
                Colors.Impossible,
            );
            throw new Error('That way is blocked.');
        }
        if (gameMap.getBlockingEntityAtLocation(destX, destY)) {
            window.engine.messageLog.addMessage(
                'That way is blocked.',
                Colors.Impossible,
            );
            throw new Error('That way is blocked.');
        }

        // Move player
        entity.move(this.dx, this.dy);

        // move camera
        if (entity === window.engine.player) {
            gameMap.cameraX = entity.x - Math.floor(gameMap.display.getOptions().width! / 2);
            gameMap.cameraY = entity.y - Math.floor(gameMap.display.getOptions().height! / 2);
        }
    }
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

export class MeleeAction extends ActionWithDirection {
    perform(actor: Actor) {
        const destX = actor.x + this.dx;
        const destY = actor.y + this.dy; //get destination

        const target = window.engine.gameMap.getActorAtLocation(destX, destY); //find target
        if (!target) {
            window.engine.messageLog.addMessage(
                'Nothing to attack',
                Colors.Impossible,
            );
            throw new Error('Nothing to attack.');
        }

        const damage = actor.fighter.power - target.fighter.defense; //calculate damage
        const attackDescription = `${actor.name.toUpperCase()} attacks ${target.name
            }`;

        const fg =
            actor.name === 'Player' ? Colors.PlayerAttack : Colors.EnemyAttack;
        if (damage > 0) {
            window.engine.messageLog.addMessage(
                `${attackDescription} for ${damage} dmg.`,
                fg,
            );
            target.fighter.hp -= damage;
        } else {
            window.engine.messageLog.addMessage(
                `${attackDescription} but does no dmg.`,
                fg,
            );
        }
    }
}

export class LogAction implements Action {
    perform(_entity: Entity) {
        window.engine.state = EngineState.Log;
    }
}
export class InventoryAction implements Action {
    constructor(public isUsing: boolean) { }

    perform(_entity: Entity) {
        window.engine.state = this.isUsing
            ? EngineState.UseInventory
            : EngineState.DropInventory;
    }
}

class DropItem extends ItemAction {
    perform(entity: Entity) {
        const dropper = entity as Actor;
        if (!dropper) return;
        dropper.inventory.drop(this.item);
    }
}
export function handleInventoryInput(event: KeyboardEvent): Action | null {
    let action = null;
    if (event.key.length === 1) {
        const ordinal = event.key.charCodeAt(0);
        const index = ordinal - 'a'.charCodeAt(0);

        if (index >= 0 && index <= 26) {
            const item = window.engine.player.inventory.items[index];
            if (item) {
                if (window.engine.state === EngineState.UseInventory) {
                    action = item.consumable.getAction();
                } else if (window.engine.state === EngineState.DropInventory) {
                    action = new DropItem(item);
                }
            } else {
                window.engine.messageLog.addMessage('Invalid entry.', Colors.Invalid);
                return null;
            }
        }
    }
    window.engine.state = EngineState.Game;
    return action;
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
    g: new PickupAction(),
    i: new InventoryAction(true),
    k: new InventoryAction(false),
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