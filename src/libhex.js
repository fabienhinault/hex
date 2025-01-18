"use strict";

export function range(size, startAt = 0) {
    return [...Array(size).keys()].map(i => i + startAt);
}

export function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}


export function optimum(array, f, compare, initialValue) {
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

export function pick(array) {
    return array[getRandomInt(0, array.length)];
}

export function argsMin(array, f) {
    return min(array, f).elements;
}

export function randArgMin(array, f) {
    return pick(argsMin(array, f));
}

function max(array, f) {
    return optimum(array, f, (x,y) => x > y, Number.NEGATIVE_INFINITY)
}

export function argsMax(array, f) {
    return max(array, f).elements;
}

export function argsOpt(array, f, compare, initialValue) {
    return optimum(array, f, compare, initialValue).elements;
}

export function randArgOpt(array, f, compare, initialValue) {
    return optimum(array, f, compare, initialValue).elements;
}

export function pickWeighted(weighteds) {
    const summedWeights = weighteds.reduce((acc, cur) => {
        acc.push((acc[acc.length - 1] ?? 0) + cur.weight);
        return acc;
    }, []);
    const r = Math.random() * summedWeights[summedWeights.length - 1];
    return weighteds[summedWeights.findIndex(aw => aw >= r)];
}

export function partition(array, isValid) {
    return array.reduce(
        ([pass, fail], elem) => {
            if (isValid(elem)) {
                pass.push(elem);
            } else {
                fail.push(elem);
            }
            return [pass, fail];
        }, 
        [[], []]
    );
}
