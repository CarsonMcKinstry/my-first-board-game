import { BehaviorSubject, merge, Subscription } from "rxjs";
import { throttleTime, share, filter, mapTo } from "rxjs/operators";
import {
  Game,
  AUTO,
  Types,
  Scene,
  GameObjects,
  Tilemaps,
  Input,
  Geom
} from "phaser";
import { ControllerMapping, getMapping } from "./gamepadMappings";

import UnitPane from "./UnitPane.svelte";

interface AxesEvent {
  direction: string;
}

interface WASD {
  up: Input.Keyboard.Key;
  down: Input.Keyboard.Key;
  left: Input.Keyboard.Key;
  right: Input.Keyboard.Key;
}

const leftKey = () => filter(({ direction }) => direction === "left");
const rightKey = () => filter(({ direction }) => direction === "right");
const upKey = () => filter(({ direction }) => direction === "up");
const downKey = () => filter(({ direction }) => direction === "down");

const sensitivity = 0.25;

class Unit extends GameObjects.Sprite {
  // private config: [Scene, number, number, string, string | integer];
  private textureId: string;
  private frameInfo: string | integer;

  private moves: [number, number][] = [];

  constructor(
    public id: number,
    public charConfig: Record<string, any>,
    scene: Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | integer
  ) {
    super(scene, x, y, texture, frame);
    this.textureId = texture;
    this.frameInfo = frame;
  }

  clone() {
    return new GameObjects.Sprite(
      this.scene,
      this.x,
      this.y,
      this.textureId,
      this.frameInfo
    );
  }

  addMovement(x: number, y: number) {
    this.moves.push([x, y]);
  }

  move(moves = this.moves) {
    if (moves.length < 1) {
      this.moves = [];
      return;
    }

    const [move, ...rest] = moves;
    const [x, y] = move;
    this.x += x;
    this.y += y;

    setTimeout(() => {
      this.move(rest);
    }, 75);
  }
}

class MyScene extends Scene {
  private map: Tilemaps.Tilemap;
  private tileset: Tilemaps.Tileset;
  private cursorKeys: Types.Input.Keyboard.CursorKeys;
  private player: GameObjects.Sprite;
  private char: GameObjects.Sprite;
  private movementLayer: Tilemaps.StaticTilemapLayer;
  private pad: Input.Gamepad.Gamepad;
  private axesEvents: BehaviorSubject<AxesEvent> = new BehaviorSubject({
    direction: null
  });
  private axesListener: Subscription;
  private wasd: WASD;
  private select: Input.Keyboard.Key;
  private controllerMapping: ControllerMapping;
  private units: GameObjects.Group;
  private selected?: Unit;
  private ghost?: GameObjects.Sprite;
  private viewing?: Unit;

  preload() {
    this.load.atlas({
      key: "char_sprites",
      textureURL: "sprites.png",
      atlasURL: "sprites.json"
    });
    this.load.image("tiles", "tilemap.png");
    this.load.tilemapTiledJSON("map", "my-map.json");
    this.load.spritesheet("selector", "selector.png", {
      frameHeight: 32,
      frameWidth: 32
    });
  }

  create() {
    this.map = this.make.tilemap({ key: "map" });
    this.tileset = this.map.addTilesetImage("tilemap", "tiles");
    this.movementLayer = this.map.createStaticLayer(
      "Tile Layer 1",
      this.tileset,
      0,
      0
    );

    this.cursorKeys = this.input.keyboard.createCursorKeys();

    this.wasd = this.input.keyboard.addKeys({
      up: Input.Keyboard.KeyCodes.W,
      down: Input.Keyboard.KeyCodes.S,
      left: Input.Keyboard.KeyCodes.A,
      right: Input.Keyboard.KeyCodes.D
    }) as WASD;

    this.select = this.input.keyboard.addKey(Input.Keyboard.KeyCodes.SPACE);

    this.units = this.add.group();

    for (let i = 0; i < 5; i++) {
      const hpTotal = Math.floor(Math.random() * 50) + 15;
      const char = new Unit(
        i,
        {
          name: `dude-${i}`,
          avatar: "dude-avatar.png",
          hp: {
            left: Math.floor(Math.random() * hpTotal) + 15,
            total: hpTotal
          }
        },
        this,
        (i + 3) * 32,
        (i + 3) * 32,
        "char_sprites",
        "jacen1.png"
      );

      this.add.existing(char);
      this.units.add(char);
    }

    this.player = this.add.sprite(32 * 3, 32 * 3, "selector").setOrigin(0, 0);

    this.anims.create({
      key: "selector_active",
      frames: this.anims.generateFrameNumbers("selector", {
        start: 2,
        end: 6
      }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "selector_idle",
      frames: this.anims.generateFrameNumbers("selector", {
        start: 0,
        end: 0
      })
    });

    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.startFollow(this.player);

    this.player.play("selector_idle");

    this.setupInputs();
  }

  update(time, delta) {
    if (this.pad) {
      this.getAxisMovement();
      this.getPadMovement();
    }
    this.getKeyMovement();

    if (this.selected) {
    } else {
      const boundsA = this.player.getBounds();
      const current = this.units.getChildren().find(unit => {
        const bounds = (unit as GameObjects.Sprite).getBounds();
        return (
          bounds.x === boundsA.x &&
          bounds.y === boundsA.y &&
          bounds.height === boundsA.height &&
          bounds.width === boundsA.height
        );
      });
      if (current && !this.viewing) {
        this.viewing = current as Unit;
        (this.game as MyGame).openUnitPane(this.viewing);
      } else if (!current && this.viewing) {
        (this.game as MyGame).closeUnitPane();
        this.viewing = undefined;
      }
    }
  }

  setupInputs() {
    const axesEvents = this.axesEvents.pipe(
      throttleTime(100),
      share()
    );

    const moveLeft = () => mapTo(this.gridMove(-32));
    const moveRight = () => mapTo(this.gridMove(32));
    const moveUp = () => mapTo(this.gridMove(null, -32));
    const moveDown = () => mapTo(this.gridMove(null, 32));

    const dpadLeft = axesEvents.pipe(
      leftKey(),
      moveLeft()
    );
    const dpadRight = axesEvents.pipe(
      rightKey(),
      moveRight()
    );
    const dpadUp = axesEvents.pipe(
      upKey(),
      moveUp()
    );
    const dpadDown = axesEvents.pipe(
      downKey(),
      moveDown()
    );

    this.axesListener = merge(dpadLeft, dpadRight, dpadUp, dpadDown).subscribe(
      move => {
        move();
      }
    );

    this.input.gamepad.on("connected", () => {
      this.pad = this.input.gamepad.pad1;
      this.controllerMapping = getMapping(this.pad.id);
    });

    this.input.gamepad.on("disconnected", () => {
      if (this.axesListener) {
        this.axesListener.unsubscribe();
      }
    });

    const controllerInput = new BehaviorSubject({
      action: null
    });

    controllerInput.subscribe(({ action }) => {
      if (action) {
        switch (action) {
          case "confirm": {
            this.selectUnit();
          }
        }
      }
    });

    this.input.gamepad.on("down", e => {
      if (this.controllerMapping) {
        if (e.A) {
          controllerInput.next({
            action: this.controllerMapping.A
          });
        } else if (e.B) {
          controllerInput.next({
            action: this.controllerMapping.B
          });
        } else if (e.X) {
          controllerInput.next({
            action: this.controllerMapping.X
          });
        } else if (e.Y) {
          controllerInput.next({
            action: this.controllerMapping.Y
          });
        }
      }
    });

    this.select.on("down", this.selectUnit);
  }

  selectUnit = () => {
    if (this.selected && this.ghost) {
      this.selected.move();

      this.ghost.destroy();
      (this.game as MyGame).closeUnitPane();
      this.selected = undefined;

      this.player.play("selector_idle");
    } else {
      const boundsA = this.player.getBounds();
      const current = this.units.getChildren().find(unit => {
        const bounds = (unit as GameObjects.Sprite).getBounds();
        return (
          bounds.x === boundsA.x &&
          bounds.y === boundsA.y &&
          bounds.height === boundsA.height &&
          bounds.width === boundsA.height
        );
      });

      if (current) {
        this.selected = current as Unit;
        this.ghost = (current as Unit).clone();
        this.ghost.setAlpha(0.5);
        this.add.existing(this.ghost);
        this.player.play("selector_active");
      }
    }
  };

  gridMove = (x = 0, y = 0) => () => {
    const tile = this.movementLayer.getTileAtWorldXY(
      this.player.x + x,
      this.player.y + y,
      true
    );
    if (tile && tile.index !== 2) {
      this.player.x += x;
      this.player.y += y;
      this.player.angle = 0;

      if (this.ghost) {
        this.ghost.x += x;
        this.ghost.y += y;
        this.ghost.angle = 0;
      }
      if (this.selected) {
        this.selected.addMovement(x, y);
      }
    }
  };

  getAxisMovement() {
    const xAxis = this.pad.getAxisValue(0);
    if (xAxis < -sensitivity) {
      this.axesEvents.next({
        direction: "left"
      });
    } else if (xAxis > sensitivity) {
      this.axesEvents.next({
        direction: "right"
      });
    }

    const yAxis = this.pad.getAxisValue(1);
    if (yAxis < -sensitivity) {
      this.axesEvents.next({
        direction: "up"
      });
    } else if (yAxis > sensitivity) {
      this.axesEvents.next({
        direction: "down"
      });
    }
  }

  getPadMovement() {
    const up = this.pad.getButtonValue(12);
    const down = this.pad.getButtonValue(13);
    const left = this.pad.getButtonValue(14);
    const right = this.pad.getButtonValue(15);

    if (up) {
      this.axesEvents.next({ direction: "up" });
    }
    if (down) {
      this.axesEvents.next({ direction: "down" });
    }
    if (right) {
      this.axesEvents.next({ direction: "right" });
    }
    if (left) {
      this.axesEvents.next({ direction: "left" });
    }
  }

  getKeyMovement() {
    if (this.cursorKeys.up.isDown || this.wasd.up.isDown) {
      this.axesEvents.next({ direction: "up" });
    }
    if (this.cursorKeys.down.isDown || this.wasd.down.isDown) {
      this.axesEvents.next({ direction: "down" });
    }
    if (this.cursorKeys.left.isDown || this.wasd.left.isDown) {
      this.axesEvents.next({ direction: "left" });
    }
    if (this.cursorKeys.right.isDown || this.wasd.right.isDown) {
      this.axesEvents.next({ direction: "right" });
    }
  }
}

export const gameSettings = {
  playerSpeed: 100
};

const width = 640;
const height = 512;

export const config: Types.Core.GameConfig = {
  type: AUTO,
  width,
  height,
  parent: document.getElementById("game"),
  input: {
    gamepad: true
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  backgroundColor: "#000000",

  scene: [MyScene]
};

class MyGame extends Game {
  public unitPane?: UnitPane;

  constructor(config: Types.Core.GameConfig) {
    super(config);
  }

  openUnitPane(unit: Unit) {
    this.unitPane = new UnitPane({
      target: document.getElementById("game"),
      props: {
        unit
      }
    });
  }

  closeUnitPane() {
    if (this.unitPane) {
      this.unitPane.$destroy();
      this.unitPane = undefined;
    }
  }
}

const game = new MyGame(config);
