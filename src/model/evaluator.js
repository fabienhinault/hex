import {white, black, players} from './hexModel.js';
import { pickWeighted, pick } from '../libhex.js';


const unsure = 0;


function checkNotNan(n) {
    if (Number.isNaN(n)) {
        throw new Error();
    }
    return n;
}



export class Evaluator {
    constructor(game, sequenceValueStorage, player) {
        this.game = game;
        this.game.evaluator = this;
        this.sequenceValueStorage = sequenceValueStorage;
        this.player = player ?? black;
        if (this.game.dispatcher) {
            this.game.addGameOverListener(evt => this.onGameOver(evt.winner));
        }
        this.WinningValue = new Map();
        this.WinningValue.set(white, game.size * 4);
        this.WinningValue.set(black, -game.size * 4);
        this.done = false;
    }

    /* The value of a position says if the position is winning for firstPlayer or secondPlayer.
     * It is winning for firstPlayer if the value is close to firstPlayerValue, and same for secondPlayer.
     * The value of the position depends on the value of its successors.
     * All players are considered good. If a winning move exists, the evaluation supposes she will take it.
     */
    evaluateBack(length, stored) {
        const nextPlayer = players[length % 2];
        const nextStoreds = stored.nexts.map(n => this.sequenceValueStorage.getValue(length + 1, n));
        const nextValues = nextStoreds.filter(s => s !== undefined).map(s => s.value ?? s.rawValue);
        if (nextValues.length === 0) {
            return stored.rawValue;
        }
        return nextPlayer.getBestValue(nextValues);
    }

    evaluateBackAll(length) {
        if (!this.done) {
            this.done = true;
            for (let len = length; len > this.game.sequence.length - 1; len--) {
                const map = this.sequenceValueStorage.getMap(len);
                for (let stored of map.values()) {
                    if (stored.value === undefined) {
                        stored.value = this.evaluateBack(len, stored);
                    }
                }
            }
        }
    }

    getPositionValue(game) {
        const storedValue = this.sequenceValueStorage.getValue(game.sequence.length, game.getCanonicalPositionString());
        if (storedValue !== null && storedValue !== undefined) {
            return Number(storedValue.value ?? storedValue.rawValue);
        }
        return game.getRawValue();
    }

    evaluateNexts(initiator, time) {
        this.evaluateNextsRec(initiator, time);
        if (!this.done) {
            const size = this.game.size;
            this.evaluateBackAll(size * size);
        }
    }

    evaluateNextsRec(initiator, time) {
        this.evaluateAbstractRec(initiator, time, (evaluator, t) => {
            setTimeout(() => {
                evaluator.evaluateNextsRec(initiator, t);
            }, 0);
        });
    }

    evaluateNextsSync(initiator, time) {
        this.evaluateNextsSyncRec(initiator, time);
        if (!this.done) {
            const size = this.game.size;
            this.evaluateBackAll(size * size);
        }
    }
    evaluateNextsSyncRec(initiator, time) {
        this.evaluateAbstractRec(initiator, time, (evaluator, t) => {
            evaluator.evaluateNextsSyncRec(initiator, t);
        });
    }

    evaluateAbstractRec(initiator, time, f) {
        const positionString = this.game.getCanonicalPositionString();
        const length = this.game.sequence.length;
        if (this.sequenceValueStorage.getValue(length, positionString) !== undefined) {
            return;
        }
        const now = this.game.clock.getTime()
        if (!time || now < time) {
            const possibleNexts = this.game.getPossibleNexts().map(h => this.game.afterHex(h));
            const remainingTime = (time - now) / possibleNexts.length;
            this.store(positionString, possibleNexts);
            for (let iNext = 0; iNext < possibleNexts.length; iNext++) {
                const gameCopy = possibleNexts[iNext];
                const evaluator = new Evaluator(gameCopy, this.sequenceValueStorage, this.player);
                const over = gameCopy.over;
                if (gameCopy.over) {
                    this.storeWinningGame(gameCopy);
                } else {
                    f(evaluator, now + ((iNext + 1) * remainingTime));
                }
            }
        } else {
            initiator.evaluateBackAll(length);
        }
    }

    store(positionString, possibleNexts) {
        this.sequenceValueStorage.storeValue(this.game.sequence.length, positionString, {
            rawValue: this.game.getRawValue(),
            value: undefined,
            nexts: possibleNexts.map(g => g.getCanonicalPositionString())
        });
    }

    storeWinningGame(gameCopy) {
        const rawValue = gameCopy.getRawValue();
        this.sequenceValueStorage.storeValue(
            gameCopy.sequence.length,
            gameCopy.getCanonicalPositionString(),
            {
                rawValue,
                value: rawValue,
                nexts: []
            }
        );
    }

    // choose best next move for bot
    chooseNext() {
        const possibleNextsValues = this.game.getPossibleNexts().map(move => {return {move, value:this.getMoveValue(move)};});
        const winning = possibleNextsValues.find(mv => this.player.isWinning(mv.value, this.game.size));
        if (winning) {
            return pick(this.player.getArgsBest(possibleNextsValues, _ => _.value)).move;
        }
        const notLosings = possibleNextsValues.filter(mv => !this.player.other.isWinning(mv.value, this.game.size));
        if (notLosings.length >= 1) {
            const weighteds = notLosings.map(_ => {
                return {move: _.move, weight: Math.abs(_.value)};
            });
            return (pickWeighted(weighteds)).move;
        } else {
            return pick(this.player.getArgsBest(possibleNextsValues, _ => _.value)).move;
        }
    }

    getMoveValue(hex) {
        return this.getPositionValue(this.game.after(hex.iRow, hex.iCol));
    }
}


export class MemorySequenceValueStorage {
    constructor(size) {
        this.values = new Array(size * size + 1).fill(0).map(x => new Map());
    }
    storeValue(length, positionString, value) {
        this.values[length].set(positionString, value);
    }
    getMap(length) {
        return this.values[length];
    }
    getValue(length, positionString) {
        return this.values[length].get(positionString);
    }
    removeValue(length, positionString) {
        this.values[length].delete(positionString);
    }
}
