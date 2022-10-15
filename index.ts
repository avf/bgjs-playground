import * as _ from 'lodash'
import * as BG from 'behavior-graph'
import * as PIXI from 'pixi.js'

// Fixes a problem with live reload in the parcel bundler. See this issue: https://github.com/parcel-bundler/parcel/issues/289
declare let module: any;
if (module.hot) {
    module.hot.dispose(() => {
        window.location.reload();
    })
}

type Vec2 = {
    x: number,
    y: number,
};

const boxSize = 100;

class BoxExtent extends BG.Extent {
    position: BG.State<Vec2>;
    velocity: BG.State<Vec2>;

    graphics: PIXI.Graphics;
    game: GameExtent;
    collisionMomentWithStartingPos: BG.Moment<Vec2>;

    constructor(graph: BG.Graph, initialPosition: Vec2, initialVelocity: Vec2, game: GameExtent) {
        super(graph);
        this.position = this.state(initialPosition);
        this.velocity = this.state(initialVelocity);
        this.game = game;
        this.collisionMomentWithStartingPos = this.moment();

        const blueBoxGraphics = new PIXI.Graphics();
        blueBoxGraphics.beginFill(0x0000FF);
        blueBoxGraphics.drawRect(0, 0, boxSize, boxSize);
        blueBoxGraphics.endFill();
        this.graphics = blueBoxGraphics;

        // Collision handling
        this.behavior()
            .supplies(this.velocity)
            .demands(this.collisionMomentWithStartingPos)
            .runs(() => {
                if (this.collisionMomentWithStartingPos.justUpdated) {
                    this.velocity.update({
                        x: -this.velocity.value.x,
                        y: -this.velocity.value.y
                    });
                }
            });

        // Box movement
        this.behavior()
            .supplies(this.position)
            .demands(this.game.timerTick, this.velocity, this.addedToGraph, this.collisionMomentWithStartingPos)
            .runs(() => {
                if (this.collisionMomentWithStartingPos.justUpdated && this.collisionMomentWithStartingPos.value) {
                    this.position.update({
                        x: this.collisionMomentWithStartingPos.value.x,
                        y: this.collisionMomentWithStartingPos.value.y
                    });
                } else {
                    this.position.update({
                        x: this.position.value.x + this.velocity.value.x,
                        y: this.position.value.y + this.velocity.value.y
                    });
                }
            });

        // Box rendering update (is it better to separate it like this, or leave it with the timertick demand?)
        this.behavior()
            .demands(this.position)
            .runs(() => {
                this.sideEffect(() => {
                    blueBoxGraphics.position.x = this.position.value.x;
                    blueBoxGraphics.position.y = this.position.value.y;
                });
            });

    }
}


function initialPixiSetup(): PIXI.Container {
    const pixiContainer = document.querySelector("#pixi-container") as HTMLElement;
    const pixiApplication = new PIXI.Application({ resolution: window.devicePixelRatio, autoDensity: true, resizeTo: pixiContainer, antialias: true, backgroundColor: 0xFFFFFF });
    pixiApplication.renderer.plugins.interaction.autoPreventDefault = false;
    pixiApplication.renderer.view.style.touchAction = "auto";
    pixiContainer.appendChild(pixiApplication.view);
    const rootPixiContainer = new PIXI.Container();
    pixiApplication.stage.addChild(rootPixiContainer);
    return rootPixiContainer;
}

class GameExtent extends BG.Extent {
    timerTick: BG.Moment<number>;
    mouseClick: BG.Moment<Vec2>;
    rootPixiContainer: PIXI.Container;
    boxes: BG.State<BoxExtent[]>;
    worldSize: BG.State<Vec2>;

    constructor(graph: BG.Graph, rootPixiContainer: PIXI.Container) {
        super(graph);

        this.timerTick = this.moment();
        this.mouseClick = this.moment();
        document.addEventListener("click", (e) => {
            this.mouseClick.updateWithAction({ x: e.clientX, y: e.clientY });
        });
        // TODO: remove listener
        this.rootPixiContainer = rootPixiContainer;
        this.boxes = this.state([]);
        this.worldSize = this.state({ x: 800, y: 800 });

        this.behavior()
            .supplies(this.boxes)
            .demands(this.mouseClick)
            .runs(() => {
                if (this.mouseClick.justUpdated) {
                    const minVelocity = -3;
                    const maxVelocity = 3;

                    const box = new BoxExtent(
                        this.graph,
                        { x: this.mouseClick.value!.x, y: this.mouseClick.value!.y },
                        { x: Math.random() * (maxVelocity - minVelocity) + minVelocity, y: Math.random() * (maxVelocity - minVelocity) + minVelocity },
                        this,
                    );
                    this.addChildLifetime(box);
                    box.addToGraph();
                    this.boxes.value.push(box);
                    this.boxes.updateForce(this.boxes.value);
                    this.sideEffect(() => {
                        this.rootPixiContainer.addChild(box.graphics);
                    });
                }
            });


        // Collision detection
        this.behavior()
            .demands(this.timerTick, this.worldSize, this.boxes)
            .dynamicDemands([this.boxes], () => {
                return this.boxes.value.map(box => box.position);
            })
            .runs(() => {
                if (this.timerTick.justUpdated) {
                    this.sideEffect(() => {
                        const worldSize = this.worldSize.value;
                        for (const box of this.boxes.value) {
                            if (box.position.value.x < 0 || box.position.value.x > worldSize.x
                                || box.position.value.y < 0 || box.position.value.y > worldSize.y) {
                                const newX = Math.min(Math.max(box.position.value.x, 0), worldSize.x);
                                const newY = Math.min(Math.max(box.position.value.y, 0), worldSize.y);
                                box.collisionMomentWithStartingPos.updateWithAction({ x: newX, y: newY });
                            } else {
                                for (const otherBox of this.boxes.value) {
                                    if (box === otherBox) {
                                        continue;
                                    }
                                    if (checkCollision(box.position.value, otherBox.position.value)) {
                                        // TODO: Calculate point of collision here and add it as the starting point to the update action
                                        box.collisionMomentWithStartingPos.updateWithAction();
                                        otherBox.collisionMomentWithStartingPos.updateWithAction();
                                    }
                                }
                            }
                        }
                    });
                }
            });
    }
}

function checkCollision(entity1Position: Vec2, entity2Position: Vec2): boolean {
    // TODO: This is just simple rectangle intersection, should be taking velocity into account
    const rectA = new PIXI.Rectangle(entity1Position.x, entity1Position.y, boxSize, boxSize);
    const other = new PIXI.Rectangle(entity2Position.x, entity2Position.y, boxSize, boxSize);

    const x0 = rectA.x < other.x ? other.x : rectA.x;
    const x1 = rectA.right > other.right ? other.right : rectA.right;
    if (x1 <= x0) {
        return false;
    }
    const y0 = rectA.y < other.y ? other.y : rectA.y;
    const y1 = rectA.bottom > other.bottom ? other.bottom : rectA.bottom;
    return y1 > y0;
}



const g = new BG.Graph();
const e = new GameExtent(g, initialPixiSetup());

e.addToGraphWithAction();

let previousTime = 0;

const loop = (time: number): void => {
    const deltaTime = time - previousTime;
    previousTime = time;

    e.timerTick.updateWithAction(deltaTime);
    window.requestAnimationFrame(loop);
};
window.requestAnimationFrame(time => {
    previousTime = time;
    window.requestAnimationFrame(loop);
});



