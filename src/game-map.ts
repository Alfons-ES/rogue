import * as ROT from 'rot-js';
import { Actor, Entity, Item } from './entity';
import type { Tile } from './tile-types';
import { WALL_TILE } from './tile-types';
import { Display } from 'rot-js';

export class GameMap {
    tiles: Tile[][];

    cameraX: number;
    cameraY: number;

    constructor(
        public width: number,
        public height: number,
        public display: Display,
        public entities: Entity[],
        public player: Entity,
    ) {
        this.tiles = new Array(this.height);
        for (let y = 0; y < this.height; y++) {
            const row = new Array(this.width);
            for (let x = 0; x < this.width; x++) {
                    row[x] = { ...WALL_TILE };
            }
            this.tiles[y] = row;
            
        }
        this.cameraX = this.player.x - Math.floor(this.display.getOptions().width! / 2);
        this.cameraY = this.player.y - Math.floor(this.display.getOptions().height! / 2);
    }

    public get actors(): Actor[] {
        return this.entities
            .filter((e) => e instanceof Actor)
            .map((e) => e as Actor)
            .filter((a) => a.isAlive);
    }

    isInBounds(x: number, y: number) {
        return 0 <= x && x < this.width && 0 <= y && y < this.height;
    }

    addRoom(x: number, y: number, roomTiles: Tile[][]) {
        for (let curY = y; curY < y + roomTiles.length; curY++) {
            const mapRow = this.tiles[curY];
            const roomRow = roomTiles[curY - y];
            for (let curX = x; curX < x + roomRow.length; curX++) {
                mapRow[curX] = roomRow[curX - x];
            }
        }
    }

    lightPasses(x: number, y: number): boolean {
        if (this.isInBounds(x, y)) {
            return this.tiles[y][x].transparent;
        }
        return false;
    } //lightPasses checks if a tile is transparent and 'distance' away, returns if it is

    updateFov(player: Entity) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x].visible = false;
            }
        } //reset visibility of all tiles, not leaving trail.

        const fov = new ROT.FOV.RecursiveShadowcasting(this.lightPasses.bind(this));
        fov.compute(player.x, player.y, 14, (x, y, _r, visibility) => {
            if (visibility === 1) {
                this.tiles[y][x].visible = true;
                this.tiles[y][x].seen = true;
            }
        }); //compute the field of view, setting visibility and seen properties
    }

    getBlockingEntityAtLocation(x: number, y: number): Entity | undefined {
        return this.entities.find(
            (e) => e.blocksMovement && e.x === x && e.y === y,
        );
    }
    public get nonPlayerEntities(): Entity[] {
        return this.entities.filter((e) => e.name !== 'Player');
    }

    getActorAtLocation(x: number, y: number): Actor | undefined {
        return this.actors.find((a) => a.x === x && a.y === y);
    }
    public get items(): Item[] {
        return this.entities.filter((e) => e instanceof Item).map((e) => e as Item);
    }

    removeEntity(entity: Entity) {
        const index = this.entities.indexOf(entity);
        if (index >= 0) {
            this.entities.splice(index, 1);
        }
    }

    render() {
        for (let y = 0; y < this.tiles.length; y++) {
            const row = this.tiles[y];
            for (let x = 0; x < row.length; x++) {
                const tile = row[x];

                let char = ' ';
                let fg = '#fff';
                let bg = '#000';

                if (tile.visible) {
                    char = tile.light.char;
                    fg = tile.light.fg;
                    bg = tile.light.bg;
                } else if (tile.seen) {
                    char = tile.dark.char;
                    fg = tile.dark.fg;
                    bg = tile.dark.bg;
                }

                this.display.draw(x - this.cameraX, y - this.cameraY, char, fg, bg);
            }
        }
        const sortedEntities = this.entities
            .slice()
            .sort((a, b) => a.renderOrder - b.renderOrder);

        sortedEntities.forEach((e) => {
            if (this.tiles[e.y][e.x].visible) {
                this.display.draw(e.x - this.cameraX, e.y - this.cameraY, e.char, e.fg, e.bg);
            }
        });

    }
    public get gameMap(): GameMap {
        return this;
    }

    
}