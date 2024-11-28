"use strict";

export function range(size, startAt = 0) {
    return [...Array(size).keys()].map(i => i + startAt);
}

export function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
