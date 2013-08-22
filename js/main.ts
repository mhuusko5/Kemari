/// <reference path='vendor/jquery.d.ts' />

class Game {
    public static entityTemplates = {
        wallTemplate: {
            name: 'wall',
            type: 'static',
            width: 0.33,
            friction: 0,
            density: 100,
            restitution: 0.33,
            color: 'grey',
            imageStretchToFit: true
        },
        ballTemplate: {
            name: 'ball',
            shape: 'circle',
            radius: 0.2,
            friction: 0,
            density: 0.1,
            restitution: 0.03,
            color: 'red',
            maxVelocityX: 6.8,
            maxVelocityY: 6.8,
            imageStretchToFit: true
        },
        footTemplate: {
            name: 'foot',
            shape: 'circle',
            type: 'static',
            radius: 0.26,
            friction: 0,
            density: 10,
            restitution: 0.88,
            color: 'blue',
            imageStretchToFit: true,
            onImpact: function (entity, normalForce, tangentialForce) {
                entity.applyImpulse(1, normalForce.x, normalForce.y);
            }
        }
    };

    public static worldMetrics = {
        ballFractionOfScreenDiagonal: 0.056,
        worldCheckRate: 10,
        pixelsPerMeter: 0,
        screenWidthInMeters: 0,
        screenHeightInMeters: 0,
        screenDiagonalInMeters: 0,
        adjustedDeviationFromSquareFactor: 0
    };

    public static platformImages = {
        ball0: null,
        ball1: null,
        ball2: null,
        ball3: null,
        ball4: null,
        foot: null,
        temple0: null,
        temple1: null,
        temple2: null,
        temple3: null,
        wall1: null,
        wall2: null,
        pattern: null
    };

    public static world;
    public static canvas:HTMLCanvasElement;
    public static wallpaperIndex:number = 0;
    public static inputHandler:GameInput;

    private worldGravity = 9.8;
    private ballsInPlay:any[] = [];
    private feet:any[] = [];
    private lastBallDate:Date;
    private totalBallDrops:number = 0;
    private score:number = 0;
    private gameover:bool = false;

    //Sets the difficulty specific gravity, creates the walls and feet, and starts the game
    constructor(private gameTime:number, gameDifficulty:number, gameEndedCallback:Function) {
        this.worldGravity *= gameDifficulty;

        Game.world._world.SetGravity(new Box2D.Common.Math.b2Vec2(0, this.worldGravity));

        Game.world.createEntity(Game.entityTemplates.wallTemplate, {
            height: (Game.worldMetrics.screenHeightInMeters * 10),
            x: Game.entityTemplates.wallTemplate.width / 2,
            y: -(Game.worldMetrics.screenHeightInMeters * 10) / 2
        });

        Game.world.createEntity(Game.entityTemplates.wallTemplate, {
            height: (Game.worldMetrics.screenHeightInMeters * 1.1),
            x: Game.entityTemplates.wallTemplate.width / 2,
            y: Game.worldMetrics.screenHeightInMeters / 2,
            image: Game.platformImages.wall1,
            imageStretchToFit: true,
            imageOffsetX: -(Game.entityTemplates.wallTemplate.width / 4),
            imageOffsetY: -(Game.worldMetrics.screenHeightInMeters / 4)
        });

        Game.world.createEntity(Game.entityTemplates.wallTemplate, {
            height: (Game.worldMetrics.screenHeightInMeters * 10),
            x: Game.worldMetrics.screenWidthInMeters - Game.entityTemplates.wallTemplate.width / 2,
            y: -(Game.worldMetrics.screenHeightInMeters * 10) / 2
        });

        Game.world.createEntity(Game.entityTemplates.wallTemplate, {
            height: (Game.worldMetrics.screenHeightInMeters * 1.1),
            x: Game.worldMetrics.screenWidthInMeters - Game.entityTemplates.wallTemplate.width / 2,
            y: Game.worldMetrics.screenHeightInMeters / 2,
            image: Game.platformImages.wall2,
            imageStretchToFit: true,
            imageOffsetX: -(Game.entityTemplates.wallTemplate.width / 4),
            imageOffsetY: -(Game.worldMetrics.screenHeightInMeters / 4)
        });

        this.feet.push(Game.world.createEntity(Game.entityTemplates.footTemplate, {
            image: Game.platformImages.foot,
            imageStretchToFit: true
        }));

        this.feet.push(Game.world.createEntity(Game.entityTemplates.footTemplate, {
            image: Game.platformImages.foot,
            imageStretchToFit: true
        }));

        var thisClass:Game = this;

        Game.world.onRender(function(_gameCanvasContext) {
            thisClass.updateCanvas(_gameCanvasContext);
        });

        Game.inputHandler.startCollectionInput(function(_inputPositions) {
            thisClass.setFeet(_inputPositions);
        });

        //Waits 600 milleseconds and adds a ball to the game and starts
        setTimeout(function(){
            thisClass.ballsInPlay.push(Game.world.createEntity(Game.entityTemplates.ballTemplate, {
                x: Game.worldMetrics.screenWidthInMeters / 2,
                y: -(Game.entityTemplates.ballTemplate.radius * 4),
                image: Game.platformImages['ball' + (thisClass.totalBallDrops++ % 5)]
            }));

            thisClass.lastBallDate = new Date();

            Game.world.onTick(function() {
                thisClass.checkWorld(gameEndedCallback);
            });
        }, 600);
    }

    //This is the method that is wrapped in a callback function and sent to one of the three input handlers, to set the feet position
    private setFeet(inputPositions) {
        for (var i = 0; i < 2; i++) {
            if (inputPositions[i]) {
                var metricPosition = {x: inputPositions[i].x / Game.worldMetrics.pixelsPerMeter, y: inputPositions[i].y / Game.worldMetrics.pixelsPerMeter};
                if (metricPosition.x < Game.entityTemplates.wallTemplate.width) {
                    metricPosition.x = Game.entityTemplates.wallTemplate.width;
                } else if (metricPosition.x > Game.worldMetrics.screenWidthInMeters - Game.entityTemplates.wallTemplate.width) {
                    metricPosition.x = Game.worldMetrics.screenWidthInMeters - Game.entityTemplates.wallTemplate.width;
                }

                if (metricPosition.y < 0) {
                    metricPosition.y = 0;
                } else if (metricPosition.y > Game.worldMetrics.screenHeightInMeters) {
                    metricPosition.y = Game.worldMetrics.screenHeightInMeters;
                }
                this.feet[i].position(metricPosition);
            } else {
                this.feet[i].position({x: -10 + i, y: -10 + i});
            }
        }
    }

    //Called by the Box2D rendering loop to display the score and seconds left in game
    private updateCanvas(gameCanvasContext:CanvasRenderingContext2D) {
        if (!this.gameover) {
            gameCanvasContext.fillStyle = 'black';
            var fontSize = Math.floor((Game.worldMetrics.screenDiagonalInMeters * Game.worldMetrics.pixelsPerMeter) / 40);
            if (fontSize < 9) {
                fontSize = 9;
            }
            gameCanvasContext.font = fontSize + 'pt Verdana';
            gameCanvasContext.fillText('' + Math.floor(this.score), (Game.entityTemplates.wallTemplate.width * Game.worldMetrics.pixelsPerMeter) + (Game.worldMetrics.screenDiagonalInMeters * Game.worldMetrics.pixelsPerMeter) / 34.8, gameCanvasContext.canvas.height - (Game.worldMetrics.screenDiagonalInMeters * Game.worldMetrics.pixelsPerMeter) / 38);

            gameCanvasContext.fillText(Math.floor(this.gameTime) + 's', (Game.worldMetrics.screenWidthInMeters * Game.worldMetrics.pixelsPerMeter) - ((Game.entityTemplates.wallTemplate.width * Game.worldMetrics.pixelsPerMeter) + (Game.worldMetrics.screenDiagonalInMeters * Game.worldMetrics.pixelsPerMeter) / 11.4), gameCanvasContext.canvas.height - (Game.worldMetrics.screenDiagonalInMeters * Game.worldMetrics.pixelsPerMeter) / 38);
        }
    }

    //Called 10 times a seconds to check if game is over and to update score
    private checkWorld(gameEndedCallback:Function) {
        if (!this.gameover) {
            this.gameTime -= 1 / Game.worldMetrics.worldCheckRate;

            if (this.gameTime < 0.1) {
                this.gameover = true;
                gameEndedCallback(Math.floor(this.score), 'Time');
                return;
            }

            for (var i = 0; i < this.ballsInPlay.length; i++) {
                if (this.ballsInPlay[i].position().y >= Game.worldMetrics.screenHeightInMeters + (2 * Game.entityTemplates.ballTemplate.radius) + (2 * Game.entityTemplates.footTemplate.radius)) {
                    this.ballsInPlay[i].destroy();
                    this.ballsInPlay.splice(i, 1);
                }
            }

            if (this.ballsInPlay.length == 0) {
                this.gameover = true;
                gameEndedCallback(Math.floor(this.score), 'Ball');
                return;
            } else {
                this.score += (1 / Game.worldMetrics.worldCheckRate) * Math.pow(10, (this.ballsInPlay.length - 1));
            }

            if ((new Date().getTime() - this.lastBallDate.getTime()) / 1000 >= 6) {
                this.ballsInPlay.push(Game.world.createEntity(Game.entityTemplates.ballTemplate, {
                    x: Game.worldMetrics.screenWidthInMeters / 2,
                    y: -(Game.entityTemplates.ballTemplate.radius * 4),
                    image: Game.platformImages['ball' + (this.totalBallDrops++ % 5)]
                }));

                this.lastBallDate = new Date();
            }
        }
    }

    //Stops collecting input, stops rendering and updating the game, and (necessarily!) redundantly destroys the game objects
    public destroyGame() {
        Game.inputHandler.stopCollectingInput();

        for (var key in Game.world._entities) {
            Game.world._entities[key].destroy();
        }

        Game.world._onTick = [];
        Game.world._onRender = [];

        for (var key in Game.world._entities) {
            Game.world._entities[key].destroy();
        }

        for (var key in Game.world._entities) {
            Game.world._entities[key].destroy();
        }
    }
}

//Interface for any input class – must have a start which accepts an input callback, and a stop
interface GameInput {
    startCollectionInput(newInputCallback:Function);
    stopCollectingInput();
}

//This class uses the Leap Motion JS api to listen for Leap input, normalize it to the display, and send to the Game class callback
class LeapInput implements GameInput {
    private sendInput:bool;
    private leapController;
    private inputCallback:Function;

    constructor(private canvas:HTMLCanvasElement) {
        this.leapController = new Leap.Controller();

        var thisClass:LeapInput = this;
        this.leapController.on('frame', function (frame) {
            if (thisClass.sendInput) {
                thisClass.handleInput(frame, thisClass);
            }
        });

        this.leapController.connect();
    }

    public startCollectionInput(newInputCallback:Function) {
        this.inputCallback = newInputCallback;
        this.sendInput = true;
    }

    private handleInput(frame, thisClass:LeapInput) {
        var fingers = [];
        try {
            for (var i = 0; i < 2; i++) {
                var finger = frame.hands[i].fingers[0];
                var fingerPos = finger.tipPosition;

                var adjustedDeviationFromSquareFactor = Game.worldMetrics.adjustedDeviationFromSquareFactor + (1 - Game.worldMetrics.adjustedDeviationFromSquareFactor) / 1.4;

                var percentOfWidthFromCenter = fingerPos.x / (60.0 * adjustedDeviationFromSquareFactor);
                var percentOfHeightFromBottom = (fingerPos.y - 80.0) / (120.0 / adjustedDeviationFromSquareFactor);

                var pixelsOfWidthFromLeft = (thisClass.canvas.width / 2.0) * (percentOfWidthFromCenter + 1);
                var pixelsOfHeightFromTop = (thisClass.canvas.height) * (1 - percentOfHeightFromBottom);

                fingers.push({x: pixelsOfWidthFromLeft, y: pixelsOfHeightFromTop});
            }
        } catch (e) {
        }
        thisClass.inputCallback(fingers);
    }

    public stopCollectingInput() {
        this.sendInput = false;
        this.inputCallback = null;
    }
}

//This class handles desktop browser mouse input, sending input to Game class callback
class TraditionalInput implements GameInput {
    private sendInput:bool;
    private inputCallback:Function;

    constructor(private canvas:HTMLCanvasElement) {
        var thisClass:TraditionalInput = this;
        this.canvas.addEventListener('mousemove', function (evt:MouseEvent) {
            evt.preventDefault();
            if (thisClass.sendInput) {
                var rect = canvas.getBoundingClientRect();
                var pointer = {x: evt.clientX - rect.left, y: evt.clientY - rect.top};
                thisClass.inputCallback([pointer]);
            }
        }, false);

        var handleTouches = function(evt) {
            evt.preventDefault();
            if (thisClass.sendInput && evt.touches && evt.touches.length > 0) {
                var touches = [];
                var rect = canvas.getBoundingClientRect();
                for (var i = 0; i < evt.touches.length && i < 2; i++) {
                    touches.push({x: evt.touches[i].pageX - rect.left, y: evt.touches[i].pageY - rect.top});
                }
                thisClass.inputCallback(touches);
            }
        }

        this.canvas.addEventListener('touchstart', function (evt) {
            handleTouches(evt);
        }, false);

        this.canvas.addEventListener('touchmove', function (evt) {
            handleTouches(evt);
        }, false);
    }

    public startCollectionInput(newInputCallback:Function) {
        this.inputCallback = newInputCallback;
        this.sendInput = true;
    }

    public stopCollectingInput() {
        this.sendInput = false;
        this.inputCallback = null;
    }
}

var finishedMessageIndex = 0;
var finishedMessages = [
    'That\'s a great score. Feel free to try to top it.',
    'Incredible! But don\'t get too excited. Relax before you try again.',
    'You deserve a pat on the back for that one. Another round?',
    'Just another perfect round. Take a moment to let that sink in.',
    'Skill and style, friend. That\' what you have.',
    'Now you\'re really getting in the flow of it. Another game\'s ready when you are.',
    'Bravo. No more words can describe this kind of performance. Maybe take a break and contemplate.'];

var lostMessageIndex = 0;
var lostMessages = [
    'Amazing effort, brilliant energy. You could do even better next time.',
    'Be proud of that one. But another try and you\'ll get to the end for sure.',
    'The skill\'s there. You\'re mind is centered. It\'s chance at this point, and you look lucky!',
    'About as close as you can get to a perfect round. Next time\'s the charm.',
    'Are you having fun? Because that\'s all that matters.'];

class Kemari {
    private game:Game;
    private lastGameEndMessage:string;
    private lastGameDifficulty = "1.0";

    //Kemari constructor prepares the game div and canvas, sets pixel to meters world specific values, creates Box2D world, and starts new game
    constructor(private platform:string) {
        $('#game').height($('#kemari').height());

        var gameWidth = $('#kemari').width();
        var betterGameWidth = Math.round($('#game').height() * 1.46);
        if (betterGameWidth < gameWidth) {
            gameWidth = betterGameWidth;
        }
        $('#game').width(gameWidth);
        var sideGap = ($('#kemari').width() - $('#game').width()) / 2;

        $('#game').css('position', 'fixed');
        $('#game').css('left', sideGap);
        $('#game').css('background-size', 'cover');
        $('#game').css('background-position', 'bottom center');
        $('#game').css('z-index', '10');

        Game.canvas = <HTMLCanvasElement>$('#canvas')[0];
        Game.canvas.width = $('#game').width();
        Game.canvas.height = $('#game').height();

        Game.worldMetrics.adjustedDeviationFromSquareFactor = (Game.canvas.width / Game.canvas.height) + (1 - (Game.canvas.width / Game.canvas.height)) / 1.6;
        Game.entityTemplates.wallTemplate.restitution *= Game.worldMetrics.adjustedDeviationFromSquareFactor;

        var screenDiagonalInPixels = Math.sqrt(Math.pow(Game.canvas.width, 2) + Math.pow(Game.canvas.height, 2));

        Game.worldMetrics.pixelsPerMeter = (Game.worldMetrics.ballFractionOfScreenDiagonal * screenDiagonalInPixels) / (Game.entityTemplates.ballTemplate.radius * 2);

        Game.worldMetrics.screenWidthInMeters = Game.canvas.width / Game.worldMetrics.pixelsPerMeter;
        Game.worldMetrics.screenHeightInMeters = Game.canvas.height / Game.worldMetrics.pixelsPerMeter;
        Game.worldMetrics.screenDiagonalInMeters = screenDiagonalInPixels / Game.worldMetrics.pixelsPerMeter;

        Game.world = boxbox.createWorld(Game.canvas, {
            tickFrequency: (1 / Game.worldMetrics.worldCheckRate) * 1000,
            scale: Game.worldMetrics.pixelsPerMeter
        });

        var thisClass:Kemari = this;
        function startGame(_inputHandler) {
            Game.inputHandler = _inputHandler;
            thisClass.openMenu();

            if (sideGap > 0) {
                var leftSide = $('<div>');
                leftSide.appendTo($('#kemari'));
                leftSide.css('position', 'fixed');
                leftSide.css('left', '0px');
                leftSide.width(sideGap + 1);
                leftSide.height($('#kemari').height());
                leftSide.css('background-position', 'right');
                leftSide.css('background-image', 'url(' + Game.platformImages['pattern'].src + ')');

                var rightSide = $('<div>');
                rightSide.appendTo($('#kemari'));
                rightSide.css('position', 'fixed');
                rightSide.css('right', '0px');
                rightSide.width(sideGap + 1);
                rightSide.height($('#kemari').height());
                rightSide.css('background-position', 'left');
                rightSide.css('background-image', 'url(' + Game.platformImages['pattern'].src + ')');
            }
        }

        bootbox.dialog("Do you have an attached Leap Motion device?", [
            {
                "label": "Yes!",
                "callback": function () {
                    startGame(new LeapInput(Game.canvas));
                }
            },
            {
                "label": "No (use mouse)",
                "callback": function () {
                    startGame(new TraditionalInput(Game.canvas));
                }
            }
        ]);
    }

    //Changes to a new game background image, displays the last games score (if there was one), and prompts the user to start a new game wih difficulty value
    private openMenu() {
        $('#game').css('background-image', 'url(' + Game.platformImages['temple' + (Game.wallpaperIndex++ % 4)].src + ')');

        var thisClass:Kemari = this;

        /*function newGameWithDifficulty(difficulty) {
            if (!difficulty) {
                window.open('', '_self', '');
                window.close();
            } else if (!(difficulty >= 1.0 && difficulty <= 2.0)) {
                bootbox.prompt((thisClass.lastGameEndMessage ? (thisClass.lastGameEndMessage + ' ') : '') + "New game with difficulty between 1.0 and 2.0", "Quit game", "Ready!", newGameWithDifficulty, thisClass.lastGameDifficulty);
            } else {
                thisClass.lastGameDifficulty = difficulty;

                thisClass.game = new Game(60, difficulty, function (_gameEndScore, _gameEndType) {
                    thisClass.gameEnded(_gameEndScore, _gameEndType);
                });
            }
        }

        newGameWithDifficulty(-1);*/

        bootbox.confirm((thisClass.lastGameEndMessage ? (thisClass.lastGameEndMessage + ' ') : 'Take a deep breath, and click ready to play...'), "Quit game", (thisClass.lastGameEndMessage ? "Try again!" : "Ready!"), function(ready) {
            if (ready) {
                thisClass.game = new Game(60, 1.0, function (_gameEndScore, _gameEndType) {
                    thisClass.gameEnded(_gameEndScore, _gameEndType);
                });
            } else {
                window.open('', '_self', '');
                window.close();
            }
        });
    }

    //Method called on game end, sets the points message to be displayed, and destroys the last game, and opens the new game menu
    private gameEnded(gameEndScore:number, gameEndType:string) {
        if (gameEndType == 'Time') {
            this.lastGameEndMessage = '\nYou finished with ' + gameEndScore + ' points! ' + finishedMessages[finishedMessageIndex++ % finishedMessages.length];
        } else if (gameEndType == 'Ball') {
            this.lastGameEndMessage = '\nYou dropped out a little early with ' + gameEndScore + ' points! ' + lostMessages[lostMessageIndex++ % lostMessages.length];
        }

        this.game.destroyGame();
        this.game = null;

        this.openMenu();
    }
}

//Preload platform specific image files
window.platform = 'desktop';
for (var imageName in Game.platformImages) {
    var image = new Image();
    image.src = 'img/' + window.platform + '/' + imageName + '.png';
    Game.platformImages[imageName] = image;
}

function startKemari() {
    $('#kemari').width(window.innerWidth);
    $('#kemari').height(window.innerHeight);

    var kemari:Kemari = new Kemari(window.platform);
}

var gui;
if (typeof require != 'undefined' && (gui = require('nw.gui'))) {
    var win = gui.Window.get();
    win.enterFullscreen();
    win.on('enter-fullscreen', function(){
        setTimeout(function(){
            startKemari();
        }, 150);
    });
} else {
    $(() => {
        startKemari();
    });
}