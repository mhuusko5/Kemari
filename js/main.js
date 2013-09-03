var Game = (function () {
    function Game(gameTime, gameDifficulty, gameEndedCallback) {
        this.gameTime = gameTime;
        this.worldGravity = 9.8;
        this.ballsInPlay = [];
        this.feet = [];
        this.totalBallDrops = 0;
        this.score = 0;
        this.gameover = false;
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

        var thisClass = this;

        Game.world.onRender(function (_gameCanvasContext) {
            thisClass.updateCanvas(_gameCanvasContext);
        });

        Game.inputHandler.startCollectionInput(function (_inputPositions) {
            thisClass.setFeet(_inputPositions);
        });

        setTimeout(function () {
            thisClass.ballsInPlay.push(Game.world.createEntity(Game.entityTemplates.ballTemplate, {
                x: Game.worldMetrics.screenWidthInMeters / 2,
                y: -(Game.entityTemplates.ballTemplate.radius * 4),
                image: Game.platformImages['ball' + (thisClass.totalBallDrops++ % 5)]
            }));

            thisClass.lastBallDate = new Date();

            Game.world.onTick(function () {
                thisClass.checkWorld(gameEndedCallback);
            });
        }, 600);
    }
    Game.prototype.setFeet = function (inputPositions) {
        for (var i = 0; i < 2; i++) {
            if (inputPositions[i]) {
                var metricPosition = { x: inputPositions[i].x / Game.worldMetrics.pixelsPerMeter, y: inputPositions[i].y / Game.worldMetrics.pixelsPerMeter };
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
                this.feet[i].position({ x: -10 + i, y: -10 + i });
            }
        }
    };

    Game.prototype.updateCanvas = function (gameCanvasContext) {
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
    };

    Game.prototype.checkWorld = function (gameEndedCallback) {
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
    };

    Game.prototype.destroyGame = function () {
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
    };
    Game.entityTemplates = {
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

    Game.worldMetrics = {
        ballFractionOfScreenDiagonal: 0.056,
        worldCheckRate: 10,
        pixelsPerMeter: 0,
        screenWidthInMeters: 0,
        screenHeightInMeters: 0,
        screenDiagonalInMeters: 0,
        adjustedDeviationFromSquareFactor: 0
    };

    Game.platformImages = {
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

    Game.wallpaperIndex = 0;
    return Game;
})();

var LeapInput = (function () {
    function LeapInput(canvas) {
        this.canvas = canvas;
        this.leapController = new Leap.Controller();

        var thisClass = this;
        this.leapController.on('frame', function (frame) {
            if (thisClass.sendInput) {
                thisClass.handleInput(frame, thisClass);
            }
        });

        this.leapController.connect();
    }
    LeapInput.prototype.startCollectionInput = function (newInputCallback) {
        this.inputCallback = newInputCallback;
        this.sendInput = true;
    };

    LeapInput.prototype.handleInput = function (frame, thisClass) {
        var fingers = [];
        try  {
            for (var i = 0; i < 2; i++) {
                var finger = frame.hands[i].fingers[0];
                var fingerPos = finger.tipPosition;

                var adjustedDeviationFromSquareFactor = Game.worldMetrics.adjustedDeviationFromSquareFactor + (1 - Game.worldMetrics.adjustedDeviationFromSquareFactor) / 1.4;

                var percentOfWidthFromCenter = fingerPos.x / (60.0 * adjustedDeviationFromSquareFactor);
                var percentOfHeightFromBottom = (fingerPos.y - 80.0) / (120.0 / adjustedDeviationFromSquareFactor);

                var pixelsOfWidthFromLeft = (thisClass.canvas.width / 2.0) * (percentOfWidthFromCenter + 1);
                var pixelsOfHeightFromTop = (thisClass.canvas.height) * (1 - percentOfHeightFromBottom);

                fingers.push({ x: pixelsOfWidthFromLeft, y: pixelsOfHeightFromTop });
            }
        } catch (e) {
        }
        thisClass.inputCallback(fingers);
    };

    LeapInput.prototype.stopCollectingInput = function () {
        this.sendInput = false;
        this.inputCallback = null;
    };
    return LeapInput;
})();

var TraditionalInput = (function () {
    function TraditionalInput(canvas) {
        this.canvas = canvas;
        var thisClass = this;
        this.canvas.addEventListener('mousemove', function (evt) {
            evt.preventDefault();
            if (thisClass.sendInput) {
                var rect = canvas.getBoundingClientRect();
                var pointer = { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
                thisClass.inputCallback([pointer]);
            }
        }, false);

        var handleTouches = function (evt) {
            evt.preventDefault();
            if (thisClass.sendInput && evt.touches && evt.touches.length > 0) {
                var touches = [];
                var rect = canvas.getBoundingClientRect();
                for (var i = 0; i < evt.touches.length && i < 2; i++) {
                    touches.push({ x: evt.touches[i].pageX - rect.left, y: evt.touches[i].pageY - rect.top });
                }
                thisClass.inputCallback(touches);
            }
        };

        this.canvas.addEventListener('touchstart', function (evt) {
            handleTouches(evt);
        }, false);

        this.canvas.addEventListener('touchmove', function (evt) {
            handleTouches(evt);
        }, false);
    }
    TraditionalInput.prototype.startCollectionInput = function (newInputCallback) {
        this.inputCallback = newInputCallback;
        this.sendInput = true;
    };

    TraditionalInput.prototype.stopCollectingInput = function () {
        this.sendInput = false;
        this.inputCallback = null;
    };
    return TraditionalInput;
})();

var finishedMessageIndex = 0;
var finishedMessages = [
    'That\'s a great score. Feel free to try to top it.',
    'Incredible! But don\'t get too excited. Relax before you try again.',
    'You deserve a pat on the back for that one. Another round?',
    'Just another perfect round. Take a moment to let that sink in.',
    'Skill and style, friend. That\' what you have.',
    'Now you\'re really getting in the flow of it. Another game\'s ready when you are.',
    'Bravo. No more words can describe this kind of performance. Maybe take a break and contemplate.'
];

var lostMessageIndex = 0;
var lostMessages = [
    'Amazing effort, brilliant energy. You could do even better next time.',
    'Be proud of that one. But another try and you\'ll get to the end for sure.',
    'The skill\'s there. You\'re mind is centered. It\'s chance at this point, and you look lucky!',
    'About as close as you can get to a perfect round. Next time\'s the charm.',
    'Are you having fun? Because that\'s all that matters.'
];

var Kemari = (function () {
    function Kemari(platform) {
        this.platform = platform;
        this.lastGameDifficulty = "1.0";
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

        Game.canvas = $('#canvas')[0];
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

        var thisClass = this;
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
    Kemari.prototype.openMenu = function () {
        $('#game').css('background-image', 'url(' + Game.platformImages['temple' + (Game.wallpaperIndex++ % 4)].src + ')');

        var thisClass = this;

        bootbox.confirm((thisClass.lastGameEndMessage ? (thisClass.lastGameEndMessage + ' ') : 'Take a deep breath, and click ready to play...'), "Quit game", (thisClass.lastGameEndMessage ? "Try again!" : "Ready!"), function (ready) {
            if (ready) {
                thisClass.game = new Game(60, 1.0, function (_gameEndScore, _gameEndType) {
                    thisClass.gameEnded(_gameEndScore, _gameEndType);
                });
            } else {
                window.open('', '_self', '');
                window.close();
            }
        });
    };

    Kemari.prototype.gameEnded = function (gameEndScore, gameEndType) {
        if (gameEndType == 'Time') {
            this.lastGameEndMessage = '\nYou finished with ' + gameEndScore + ' points! ' + finishedMessages[finishedMessageIndex++ % finishedMessages.length];
        } else if (gameEndType == 'Ball') {
            this.lastGameEndMessage = '\nYou dropped out a little early with ' + gameEndScore + ' points! ' + lostMessages[lostMessageIndex++ % lostMessages.length];
        }

        this.game.destroyGame();
        this.game = null;

        this.openMenu();
    };
    return Kemari;
})();

window.platform = 'desktop';
for (var imageName in Game.platformImages) {
    var image = new Image();
    image.src = 'img/' + window.platform + '/' + imageName + '.png';
    Game.platformImages[imageName] = image;
}

function startKemari() {
    $('#kemari').width(window.innerWidth);
    $('#kemari').height(window.innerHeight);

    var kemari = new Kemari(window.platform);
}

var gui;
if (typeof require != 'undefined' && (gui = require('nw.gui'))) {
    var win = gui.Window.get();
    win.enterFullscreen();
    win.on('enter-fullscreen', function () {
        setTimeout(function () {
            startKemari();
        }, 250);
    });
} else {
    $(function () {
        startKemari();
    });
}
//@ sourceMappingURL=main.js.map
