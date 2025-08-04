import {
    Action,
    BumpAction,
    DropItem,
    LogAction,
    PickupAction,
    WaitAction,
} from './actions';
import { Colors } from './colors';
import { Engine } from './engine';


interface LogMap {
    [key: string]: number;
}
const LOG_KEYS: LogMap = {
    ArrowUp: -1,
    ArrowDown: 1,
    PageDown: 10,
    PageUp: -10,
}; 
interface DirectionMap {
    [key: string]: [number, number];
}

const MOVE_KEYS: DirectionMap = {
    q: [-1, -1],
    w: [0, -1],
    e: [1, -1],
    x: [0, 1],
    s: [0, 1],
    a: [-1, 0],
    d: [1, 0],
    z: [-1, 1],
    c: [1, 1],
};
export enum InputState {
    Game,
    Dead,
    Log,
    UseInventory,
    DropInventory,
    Target,
}

export abstract class BaseInputHandler {
    nextHandler: BaseInputHandler;
    protected constructor(public inputState: InputState = InputState.Game) {
        this.nextHandler = this;
    }

    abstract handleKeyboardInput(event: KeyboardEvent): Action | null;
    abstract handleMouseInput(event: MouseEvent): Action | null;
}

export class GameInputHandler extends BaseInputHandler {
    constructor() {
        super();
    }
    handleMouseInput(_event: MouseEvent): Action | null {
        return null;
    }

    handleKeyboardInput(event: KeyboardEvent): Action | null {
        if (window.engine.player.fighter.hp > 0) {
            if (event.key in MOVE_KEYS) {
                const [dx, dy] = MOVE_KEYS[event.key];
                return new BumpAction(dx, dy);
            }
            if (event.key === 'v') {
                this.nextHandler = new LogInputHandler();
            }
            if (event.key === '5' || event.key === '.') {
                return new WaitAction();
            }
            if (event.key === 'g') {
                return new PickupAction();
            }
            if (event.key === 'i') {
                this.nextHandler = new InventoryInputHandler(InputState.UseInventory);
            }
            if (event.key === 'k') {
                this.nextHandler = new InventoryInputHandler(InputState.DropInventory);
            }
            if (event.key === 'l') {
                this.nextHandler = new LookHandler();
            }
        }
        return null;
    }
}

export class LogInputHandler extends BaseInputHandler {
    constructor() {
        super(InputState.Log);
    }

    handleMouseInput(_event: MouseEvent): Action | null {
        return null;
    }

    handleKeyboardInput(event: KeyboardEvent): Action | null {
        if (event.key === 'Home') {
            return new LogAction(() => (window.engine.logCursorPosition = 0));
        }
        if (event.key === 'End') {
            return new LogAction(
                () =>
                (window.engine.logCursorPosition =
                    window.engine.messageLog.messages.length - 1),
            );
        }

        const scrollAmount = LOG_KEYS[event.key];

        if (!scrollAmount) {
            this.nextHandler = new GameInputHandler();
        }

        return new LogAction(() => {
            if (scrollAmount < 0 && window.engine.logCursorPosition === 0) {
                window.engine.logCursorPosition =
                    window.engine.messageLog.messages.length - 1;
            } else if (
                scrollAmount > 0 &&
                window.engine.logCursorPosition ===
                window.engine.messageLog.messages.length - 1
            ) {
                window.engine.logCursorPosition = 0;
            } else {
                window.engine.logCursorPosition = Math.max(
                    0,
                    Math.min(
                        window.engine.logCursorPosition + scrollAmount,
                        window.engine.messageLog.messages.length - 1,
                    ),
                );
            }
        });
    }
}

export class InventoryInputHandler extends BaseInputHandler {
    constructor(inputState: InputState) {
        super(inputState);
    }

    handleMouseInput(_event: MouseEvent): Action | null {
        return null;
    }

    handleKeyboardInput(event: KeyboardEvent): Action | null {
        if (event.key.length === 1) {
            const ordinal = event.key.charCodeAt(0);
            const index = ordinal - 'a'.charCodeAt(0);

            if (index >= 0 && index <= 26) {
                const item = window.engine.player.inventory.items[index];
                if (item) {
                    this.nextHandler = new GameInputHandler();
                    if (this.inputState === InputState.UseInventory) {
                        return item.consumable.getAction();
                    } else if (this.inputState === InputState.DropInventory) {
                        return new DropItem(item);
                    }
                } else {
                    window.engine.messageLog.addMessage('Invalid entry.', Colors.Invalid);
                    return null;
                }
            }
        }
        this.nextHandler = new GameInputHandler();
        return null;
    }
}

export abstract class SelectIndexHandler extends BaseInputHandler {
    protected constructor() {
        super(InputState.Target);
        const { x, y } = window.engine.player;
        window.engine.mousePosition = [x, y];
    }

    handleKeyboardInput(event: KeyboardEvent): Action | null {
        if (event.key in MOVE_KEYS) {
            const moveAmount = MOVE_KEYS[event.key];
            let modifier = 1;
            if (event.shiftKey) modifier = 5;
            if (event.ctrlKey) modifier = 10;
            if (event.altKey) modifier = 20;

            let [x, y] = window.engine.mousePosition;
            const [dx, dy] = moveAmount;
            x += dx * modifier;
            y += dy * modifier;

            const clampedX = Math.max(0, Math.min(x, window.engine.display.getOptions().width! - 1));
            const clampedY = Math.max(0, Math.min(y, window.engine.display.getOptions().height! - 1));
            window.engine.mousePosition = [clampedX, clampedY];
            return null;
        } else if (event.key === 'Enter') {
            const [mouseX, mouseY] = window.engine.mousePosition;

            // Adjust for camera offset!
            const x = mouseX + window.engine.gameMap.cameraX;
            const y = mouseY + window.engine.gameMap.cameraY;

            return this.onIndexSelected(x, y);
        }

        this.nextHandler = new GameInputHandler();
        return null;
    }

    handleMouseInput(event: MouseEvent): Action | null {
        // Only respond to left click (button === 0)
        if (event.button === 0) {
            const [mouseX, mouseY] = window.engine.mousePosition;

            // Adjust for camera offset to get real map coordinates
            const x = mouseX + window.engine.gameMap.cameraX;
            const y = mouseY + window.engine.gameMap.cameraY;

            return this.onIndexSelected(x, y);
        }
        this.nextHandler = new GameInputHandler();
        return null;
    }


    abstract onIndexSelected(x: number, y: number): Action | null;
}

export class LookHandler extends SelectIndexHandler {
    constructor() {
        super();
    }

    onIndexSelected(_x: number, _y: number): Action | null {
        this.nextHandler = new GameInputHandler();
        return null;
    }
}
type ActionCallback = (x: number, y: number) => Action | null;

export class SingleRangedAttackHandler extends SelectIndexHandler {
    constructor(public callback: ActionCallback) {
        super();
    }

    onIndexSelected(x: number, y: number): Action | null {
        this.nextHandler = new GameInputHandler();
        return this.callback(x, y);
    }
}