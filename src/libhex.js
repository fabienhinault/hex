"use strict";

export function range(size, startAt = 0) {
    return [...Array(size).keys()].map(i => i + startAt);
}

export function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function optimum(array, f, compare, initialValue) {
    return array.reduce((acc, cur) => {
        const currentValue = f(cur);
        if (compare(currentValue, acc.value)) {
            return {elements: [cur], value: currentValue};
        } else if (currentValue === acc.value) {
            return {elements: [...acc.elements, cur], value: currentValue};
        } else {
            return acc;
        }
    },
    {elements: [], value: initialValue});
}

function min(array, f) {
    return optimum(array, f, (x,y) => x < y, Number.POSITIVE_INFINITY)
}

function pick(array) {
    return array[getRandomInt(0, array.length)];
}

function argsMin(array, f) {
    return min(array, f).elements;
}

export function randArgMin(array, f) {
    return pick(argsMin(array, f));
}

function max(array, f) {
    return optimum(array, f, (x,y) => x > y, Number.NEGATIVE_INFINITY)
}

function argsMax(array, f) {
    return max(array, f).elements;
}
