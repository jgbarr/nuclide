'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import {
  addRemoteProject,
  activateAllPackages,
  copyFixture,
  deactivateAllPackages,
  jasmineIntegrationTestSetup,
  startNuclideServer,
  stopNuclideServer,
} from '../pkg/nuclide-integration-test-helpers';
import {join} from '../pkg/nuclide-remote-uri';
import invariant from 'assert';

import type {RemoteConnection} from '../pkg/nuclide-remote-connection';

describe('Remote Flow Autocomplete', () => {
  it('tests remote flow autocomplete example', () => {
    let textEditor: atom$TextEditor = (null : any);
    let textEditorView: HTMLElement = (null : any);
    let flowProjectPath: string = (null : any);
    let connection: ?RemoteConnection = (null : any);
    let busySignal: HTMLElement = (null : any);

    waitsForPromise({timeout: 240000}, async () => {
      jasmineIntegrationTestSetup();
      // Activate nuclide packages.
      await activateAllPackages();
      // Copy flow project to a temporary location.
      flowProjectPath = await copyFixture('flow_project_1');

      busySignal = atom.views.getView(atom.workspace)
        .querySelector('.nuclide-busy-signal-status-bar');

      // Start the Nuclide server and add a remote project.
      await startNuclideServer();
      connection = await addRemoteProject(flowProjectPath);
      invariant(connection != null, 'connection was not established');
      // Open a remote file in the flow project we copied, and get reference to the editor's HTML.
      const remoteFileUri = join(connection.getUriForInitialWorkingDirectory(), 'main.js');
      textEditor = await atom.workspace.open(remoteFileUri);
    });

    waitsFor('spinner to start', 10000, () => {
      return busySignal.classList.contains('nuclide-busy-signal-status-bar-busy');
    });

    waitsFor('spinner to stop', 30000, () => {
      return busySignal.classList.contains('nuclide-busy-signal-status-bar-idle');
    });

    runs(() => {
      textEditorView = atom.views.getView(textEditor);
      // Simulate a keypress to trigger the autocomplete menu.
      textEditor.moveToBottom();
      textEditor.insertText('n');
    });

    let autocompleteMenuView: HTMLElement = (null : any);
    waitsFor('autocomplete suggestions to render', 10000, () => {
      autocompleteMenuView = textEditorView.querySelector('.autocomplete-plus');
      if (autocompleteMenuView != null) {
        return autocompleteMenuView.querySelector('.right-label');
      }
      return autocompleteMenuView;
    });

    waitsForPromise(async () => {
      // Check autocomplete box renders.
      expect(autocompleteMenuView).toExist();

      // Check type annotations exist and are correct.
      expect(autocompleteMenuView.querySelector('.right-label').innerText).toBe('number');
      const typeHintView = autocompleteMenuView.querySelector('.suggestion-description-content');
      expect(typeHintView).toExist();
      expect(typeHintView.innerText).toBe('number');

      // Confirm autocomplete.
      atom.commands.dispatch(textEditorView, 'autocomplete-plus:confirm');
      expect(textEditorView.querySelector('.autocomplete-plus')).not.toExist();
      const lineText = textEditor.lineTextForBufferRow(textEditor.getCursorBufferPosition().row);
      expect(lineText).toBe('num');

      // Clean up -- kill nuclide server and deactivate packages.
      invariant(connection != null);
      stopNuclideServer(connection);
      deactivateAllPackages();
    });
  });
});
