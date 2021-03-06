'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import {CompositeDisposable, Disposable} from 'atom';
import invariant from 'assert';

export type TunnelVisionProvider = {
  isVisible: () => boolean;
  toggle: () => void;
};

class Activation {
  _disposables: CompositeDisposable;

  _providers: Set<TunnelVisionProvider>;
  // Non-null iff we have entered tunnel vision mode without explicitly exiting it. See
  // _shouldRestore() and _enterTunnelVision() for a more detailed explanation.
  _restoreState: ?Set<TunnelVisionProvider>;

  constructor(state: ?Object) {
    this._disposables = new CompositeDisposable();
    this._providers = new Set();
    this._restoreState = null;

    atom.commands.add(
      atom.views.getView(atom.workspace),
      'nuclide-tunnel-vision:toggle',
      this._toggleTunnelVision.bind(this),
    );
  }

  dispose() {
    this._disposables.dispose();
  }

  consumeTunnelVisionProvider(provider: TunnelVisionProvider): IDisposable {
    this._providers.add(provider);
    return new Disposable(() => {
      this._providers.delete(provider);
    });
  }

  _toggleTunnelVision(): void {
    if (this._shouldRestore()) {
      this._exitTunnelVision();
    } else {
      this._enterTunnelVision();
    }
  }

  _shouldRestore() {
    if (this._restoreState == null) {
      return false;
    }
    for (const provider of this._providers) {
      if (provider.isVisible()) {
        // If the user has manually shown any provider they have probably forgotten they are in
        // tunnel vision mode, and intend to enter it.
        return false;
      }
    }
    return true;
  }

  _enterTunnelVision(): void {
    // This will be non-null if the user has entered tunnel vision without toggling it off, but has
    // manually opened one or more of the providers. In that case, we want to re-enter tunnel
    // vision, hiding the currently-visible providers, but when we exit we want to restore both the
    // previously-hidden providers and the currently-visible providers.
    let newRestoreState = this._restoreState;
    if (newRestoreState == null) {
      newRestoreState = new Set();
    }
    for (const provider of this._providers) {
      if (provider.isVisible()) {
        provider.toggle();
        newRestoreState.add(provider);
      }
    }
    this._restoreState = newRestoreState;
  }

  _exitTunnelVision(): void {
    const restoreState = this._restoreState;
    invariant(restoreState != null);
    for (const provider of restoreState) {
      if (!provider.isVisible()) {
        provider.toggle();
      }
    }
    this._restoreState = null;
  }
}

let activation: ?Activation = null;

export function activate(state: ?Object) {
  if (activation == null) {
    activation = new Activation(state);
  }
}

export function deactivate() {
  if (activation != null) {
    activation.dispose();
    activation = null;
  }
}

export function consumeTunnelVisionProvider(provider: TunnelVisionProvider): IDisposable {
  invariant(activation != null);
  return activation.consumeTunnelVisionProvider(provider);
}
