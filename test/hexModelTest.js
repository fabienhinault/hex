import { strict as assert } from 'assert';
import {Game} from '../hexModel.js';


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
    });;
    it('should play on a Game constructed with 1', function () {
      const game = new Game(1);
      game.play(0, 0);
    });

  });

  
});

