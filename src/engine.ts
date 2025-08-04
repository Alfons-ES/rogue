
import * as ROT from 'rot-js';
import {
    BaseInputHandler,
    GameInputHandler,
    InputState,
} from './input-handler';
import { Action } from './actions';
import { Actor } from './entity';
import { GameMap } from './game-map';
import { generateDungeon } from './procgen';
import {
    renderFrameWithTitle,
    renderHealthBar,
    renderNamesAtLocation,
} from './render-functions';
import { MessageLog } from './message-log';
import { Colors } from './colors';
import { ImpossibleException } from './exceptions';
export class Engine {
    public static readonly WIDTH = 73;
    public static readonly HEIGHT = 34;
    public static readonly MAP_WIDTH = 200;
    public static readonly MAP_HEIGHT = 200;
    public static readonly MIN_ROOM_SIZE = 6;
    public static readonly MAX_ROOM_SIZE = 11;
    public static readonly MAX_ROOMS = 50;
    public static readonly MAX_MONSTERS_PER_ROOM = 2;
    public static readonly MAX_ITEMS_PER_ROOM = 40;

    inputHandler: BaseInputHandler
    display: ROT.Display;
    gameMap: GameMap;
    messageLog: MessageLog;
    mousePosition: [number, number];
    logCursorPosition: number;

    constructor(public player: Actor) {
        this.inputHandler = new GameInputHandler();
        this.logCursorPosition = 0;
        this.display = new ROT.Display({
            width: Engine.WIDTH,
            height: Engine.HEIGHT,
            forceSquareRatio: true,
            fontSize: 34,
            spacing: 0.85,
            fontFamily: 'Libertinus Sans'
        });
        this.mousePosition = [0, 0];
        const container = this.display.getContainer()!;
        document.body.appendChild(container);

        this.messageLog = new MessageLog();
        this.messageLog.addMessage(
            'Welcome to game!',
            Colors.WelcomeText,
        );

        this.gameMap = generateDungeon(
            Engine.MAP_WIDTH,
            Engine.MAP_HEIGHT,
            Engine.MAX_ROOMS,
            Engine.MIN_ROOM_SIZE,
            Engine.MAX_ROOM_SIZE,
            Engine.MAX_MONSTERS_PER_ROOM,
            Engine.MAX_ITEMS_PER_ROOM,
            player,
            this.display,
        );
        
    this.gameMap.cameraX = this.player.x - Math.floor(this.display.getOptions().width! / 2);
    this.gameMap.cameraY = this.player.y - Math.floor(this.display.getOptions().height! / 2);

        window.addEventListener('keydown', (event) => {
            this.update(event);
        });

        window.addEventListener('mousedown', (event) => {
            this.update(event);
        });
        window.addEventListener('contextmenu', (event) => event.preventDefault());

        window.addEventListener('mousemove', (event) => {
            this.mousePosition = this.display.eventToPosition(event);
            this.render();
        });

        this.gameMap.updateFov(this.player);
    }

    handleEnemyTurns() {
        this.gameMap.actors.forEach((e) => {
            if (e.isAlive) {
                try {
                    e.ai?.perform(e);
                } catch { }
            }
        });
    }

    update(event: KeyboardEvent | MouseEvent) {
        let action: Action | null = null;

        if (event instanceof KeyboardEvent) {
            action = this.inputHandler.handleKeyboardInput(event);
        } else if (event instanceof MouseEvent) {
            action = this.inputHandler.handleMouseInput(event);
        }

        if (action instanceof Action) {
            try {
                action.perform(this.player);
                this.handleEnemyTurns();
                this.gameMap.updateFov(this.player);
            } catch (error) {
                if (error instanceof ImpossibleException) {
                    this.messageLog.addMessage(error.message, Colors.Impossible);
                }
            }
        }

        this.inputHandler = this.inputHandler.nextHandler;
        this.render();
    }

    render() { //w:73 h:34
        this.display.clear();
        this.gameMap.render();

        renderHealthBar(
            this.display,
            this.player.fighter.hp,
            this.player.fighter.maxHp,
            11,
        );
        this.messageLog.render(this.display, 0, 30, 32, 4);

        renderNamesAtLocation();

        if (this.inputHandler.inputState === InputState.Log) {
            renderFrameWithTitle(0, 0, 73, 34, 'Log');
            this.messageLog.render(
                this.display,
                1,
                1,
                71,
                32,
            );
        }
        if (this.inputHandler.inputState === InputState.UseInventory) {
            this.renderInventory('Select an item to use');
        }
        if (this.inputHandler.inputState === InputState.DropInventory) {
            this.renderInventory('Select an item to drop');
        }
        if (this.inputHandler.inputState === InputState.Target) {
            const [x, y] = this.mousePosition;
            const data = this.display._data[`${x},${y}`];
            const char = data ? data[2] || ' ' : ' ';
            this.display.drawOver(x, y, char[4], '#000', '#fff');
        }
    }

    renderInventory(title: string) {
        const itemCount = this.player.inventory.items.length;
        const height = itemCount + 2 <= 3 ? 3 : itemCount + 2;
        const width = title.length + 4;
        const x = 43;
        const y = 0;

        renderFrameWithTitle(x, y, width, height, title);

        if (itemCount > 0) {
            this.player.inventory.items.forEach((i, index) => {
                const key = String.fromCharCode('a'.charCodeAt(0) + index);
                this.display.drawText(x + 1, y + index + 1, `(${key}) ${i.name}`);
            });
        } else {
            this.display.drawText(x + 1, y + 1, '(Empty)');
        }
    }
}
