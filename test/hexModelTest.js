import { strict as assert } from 'assert';
import {Game, white, black} from '../src/hexModel.js';


describe('Hex', function () {
  describe('Game', function () {
    it('should construct a Game', function () {
      assert.doesNotThrow(() => new Game());
    });
    it('should get 1 as size of a Game constructed with 1', function () {
      const game = new Game(1);
      assert.equal(1, game.size);
      assert.equal(1, game.board.length);
      assert.equal(game.board[0].length, 1);
      assert.equal(game.board[0][0].iRow, 0);
      assert.equal(game.board[0][0].iCol, 0);
      assert.equal(game.board[0][0].getColumnLetter(), 'A');
    });

    it('should play on a Game constructed with 1', function () {
      const game = new Game(1);
      const isWinning = game.play(0, 0);
      assert(isWinning);
      assert.equal(game.chains.get(white).size, 1);
      assert(game.chains.get(white).values().next().value.isWinning());
    });

    it('should throw an error when playing on a colored hex', function () {
      const game = new Game(1);
      game.play(0, 0);
      assert.throws(() => game.play(0, 0), new Error("illegal move"));
    });

    it('should throw an error when playing outside the board', function () {
      const game = new Game(1);
      assert.throws(() => game.play(-1, 0), new Error("out of board -1 0"));
    });

    it('should play on a Game constructed with 2', function () {
      const game = new Game(2);
      let isWinning = game.play(0, 0);
      assert(!isWinning);
      assert.equal(game.chains.get(white).size, 1);
      assert(!game.chains.get(white).values().next().value.isWinning());

      isWinning = game.play(1, 1);
      assert(!isWinning);
      assert.equal(game.chains.get(black).size, 1);
      assert(!game.chains.get(black).values().next().value.isWinning());

      isWinning = game.play(1, 0);
      assert(isWinning);
      assert.equal(game.chains.get(white).size, 1);
      assert(game.chains.get(white).values().next().value.isWinning());
    });

    it('should play on a Game constructed with 2', function () {
      const game = new Game(2);
      let isWinning = game.play(0, 0);
      assert(!isWinning);
      assert.equal(game.chains.get(white).size, 1);
      assert(!game.chains.get(white).values().next().value.isWinning());

      isWinning = game.play(1, 1);
      assert(!isWinning);
      assert.equal(game.chains.get(black).size, 1);
      assert(!game.chains.get(black).values().next().value.isWinning());

      isWinning = game.play(0, 1);
      assert(!isWinning);
      assert.equal(game.chains.get(white).size, 1);
      assert(!game.chains.get(white).values().next().value.isWinning());

      isWinning = game.play(1, 0);
      assert(isWinning);
      assert.equal(game.chains.get(black).size, 1);
      assert(game.chains.get(black).values().next().value.isWinning());
    });
  });

  
});

