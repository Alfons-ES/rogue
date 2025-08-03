import { Actor, Entity, Item } from './entity';
import { Colors } from './colors';
import { ImpossibleException } from './exceptions';

export abstract class Action {
    abstract perform(entity: Entity): void;
}

export class PickupAction extends Action {
    perform(entity: Entity) {
        const consumer = entity as Actor;
        if (!consumer) return;

        const { x, y, inventory } = consumer;

        for (const item of window.engine.gameMap.items) {
            if (x === item.x && y == item.y) {
                if (inventory.items.length >= inventory.capacity) {
                    window.engine.messageLog.addMessage(
                        'Your inventory is full.',
                        Colors.Impossible,
                    );
                    throw new ImpossibleException('Your inventory is full.');
                }

                window.engine.gameMap.removeEntity(item);
                item.parent = inventory;
                inventory.items.push(item);

                window.engine.messageLog.addMessage(`You picked up the ${item.name}!`);
                return;
            }
        }

        window.engine.messageLog.addMessage(
            'There is nothing here to pick up.',
            Colors.Impossible,
        );
        throw new ImpossibleException('There is nothing here to pick up.');
    }
}

export class ItemAction extends Action {
    constructor(
        public item: Item | null,
        public targetPosition: [number, number] | null = null,
    ) {
        super();
    }
    public get targetActor(): Actor | undefined {
        if (!this.targetPosition) {
            return;
        }
        const [x, y] = this.targetPosition;
        return window.engine.gameMap.getActorAtLocation(x, y);
    }
    perform(entity: Entity) {
        this.item?.consumable.activate(this, entity);
    }
}

export class WaitAction extends Action {
    perform(_entity: Entity) { }
}

export abstract class ActionWithDirection extends Action {
    constructor(public dx: number, public dy: number) {
        super();
    }

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
            throw new ImpossibleException('That way is blocked.');
        }
        if (!gameMap.tiles[destY][destX].walkable) {
            window.engine.messageLog.addMessage(
                'That way is blocked.',
                Colors.Impossible,
            );
            throw new ImpossibleException('That way is blocked.');
        }
        if (gameMap.getBlockingEntityAtLocation(destX, destY)) {
            window.engine.messageLog.addMessage(
                'That way is blocked.',
                Colors.Impossible,
            );
            throw new ImpossibleException('That way is blocked.');
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

        if (window.engine.gameMap.getActorAtLocation(destX, destY)) {
            return new MeleeAction(this.dx, this.dy).perform(entity as Actor);
        } else {
            return new MovementAction(this.dx, this.dy).perform(entity);
        }
    }
}

export class MeleeAction extends ActionWithDirection {
    perform(actor: Actor) {
        const destX = actor.x + this.dx;
        const destY = actor.y + this.dy;//get destination

        const target = window.engine.gameMap.getActorAtLocation(destX, destY); //find target
        if (!target) {
            window.engine.messageLog.addMessage(
                'Nothing to attack',
                Colors.Impossible,
            );
            throw new ImpossibleException('Nothing to attack');
        }

        const damage = actor.fighter.power - target.fighter.defense;//calculate damage
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

export class LogAction extends Action {
    constructor(public moveLog: () => void) {
        super();
    }

    perform(_entity: Entity) {
        this.moveLog();
    }
}

export class DropItem extends ItemAction {
    perform(entity: Entity) {
        const dropper = entity as Actor;
        if (!dropper || !this.item) return;
        dropper.inventory.drop(this.item);
    }
}