'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {Task} from '../lib/bootstrap';

const invariant = require('assert');
const {createTask} = require('..');
const {expectAsyncFailure} = require('../../nuclide-test-helpers');

describe('Task', () => {
  describe('.invokeRemoteMethod()', () => {
    let task: ?Task = null;

    beforeEach(() => {
      task = createTask();
    });

    afterEach(() => {
      invariant(task);
      task.dispose();
      task = null;
    });

    // Note: files loaded via invokeRemoteMethod() use a variety of ES6/7+
    // features to verify that Babel transpilation is working as intended.

    it('can call a synchronous function that is a lone export', () => {
      waitsForPromise(async () => {
        invariant(task);
        const result = await task.invokeRemoteMethod({
          file: require.resolve('./fixtures/one-export-returns-object'),
          args: ['add me!'],
        });
        expect(result).toEqual({foo: 'bar', baz: 'add me!'});
      });
    });

    it('can call an async function that is a lone export', () => {
      waitsForPromise(async () => {
        invariant(task);
        const result = await task.invokeRemoteMethod({
          file: require.resolve('./fixtures/one-export-returns-string-async'),
        });
        expect(result).toEqual('#winning');
      });
    });

    // t7542202: fix this test and re-enable it
    xit('can call a synchronous function from an exports object', () => {
      waitsForPromise(async () => {
        invariant(task);
        const result = await task.invokeRemoteMethod({
          file: require.resolve('./fixtures/multiple-exports'),
          method: 'product',
          args: [1, 2, 3, 4, 5],
        });
        expect(result).toBe(120);
      });
    });

    // t7542202: fix this test and re-enable it
    xit('can call an async function from an exports object', () => {
      waitsForPromise(async () => {
        invariant(task);
        const result = await task.invokeRemoteMethod({
          file: require.resolve('./fixtures/multiple-exports'),
          method: 'asyncFetch',
        });
        expect(result).toEqual({shouldShowUpInJsonSerialization: null});
      });
    });

    it('persists the process it creates (does not create a new one each time)', () => {
      waitsForPromise(async () => {
        function increment() {
          invariant(task);
          return task.invokeRemoteMethod({
            file: require.resolve('./fixtures/multiple-exports'),
            method: 'increment',
          });
        }
        await Promise.all([increment(), increment(), increment()]);

        invariant(task);
        const result = await task.invokeRemoteMethod({
          file: require.resolve('./fixtures/multiple-exports'),
          method: 'getTotal',
        });
        expect(result).toBe(3);
      });
    });

    it('synchronous function that throws Error returns a rejected Promise', () => {
      waitsForPromise(async () => {
        invariant(task);
        const promise = task.invokeRemoteMethod({
          file: require.resolve('./fixtures/exports-that-fail'),
          method: 'throwsErrorSynchronously',
        });
        await expectAsyncFailure(promise, error => {
          expect(error.message).toBe('All I do is fail.');
        });
      });
    });

    it('synchronous function that returns a rejected Promise returns a rejected Promise', () => {
      waitsForPromise(async () => {
        invariant(task);
        const promise = task.invokeRemoteMethod({
          file: require.resolve('./fixtures/exports-that-fail'),
          method: 'returnsRejectedPromise',
        });
        await expectAsyncFailure(promise, error => {
          expect(error.message).toBe('Explicit fail with rejected Promise.');
        });
      });
    });

    it('async function that throws returns a rejected Promise', () => {
      waitsForPromise(async () => {
        invariant(task);
        const promise = task.invokeRemoteMethod({
          file: require.resolve('./fixtures/exports-that-fail'),
          method: 'asyncFunctionThatThrows',
        });
        await expectAsyncFailure(promise, error => {
          expect(error.message).toBe('All I do is fail *asynchronously*.');
        });
      });
    });
  });

  it('calls onError upon error', () => {
    const spy = jasmine.createSpy('exit');
    const task = createTask();
    task.onError(spy);
    task._child.disconnect();
    task.invokeRemoteMethod({
      file: 'test',
      method: null,
      args: null,
    });
    waitsFor(() => {
      return spy.callCount > 0;
    });
  });
});
