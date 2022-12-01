/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {createReactor} from 'redux-reactors';
import type {ReactorAction} from 'redux-reactors';
import type {Reducer, Store} from 'redux';

export type ActionType = {
  type: string,
  payload: *,
};

type RPCReactorsType<TType, TPayload> = {
  start: ReactorAction<TType, TPayload>,
  success: ReactorAction<TType, TPayload>,
  failure: ReactorAction<TType, TPayload>,
};

type RPCReducersType<S, A: ActionType> = {
  start?: Reducer<S, A>,
  success?: Reducer<S, A>,
  failure?: Reducer<S, A>,
};

type NormalizedRPCReducersType<S, A: ActionType> = {
  start: Reducer<S, A>,
  success: Reducer<S, A>,
  failure: Reducer<S, A>,
};

function camelUpper(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toUpperCase();
}

const noopReducer: Reducer<*, *> = (state) => state;

type ActionNamesType = {failure: string, start: string, success: string};
type ActionTypesType = $Keys<ActionNamesType>;
const types: Array<ActionTypesType> = ['start', 'success', 'failure'];

function createActionNames(rpcId: string): ActionNamesType {
  const rpcActionName = camelUpper(rpcId);
  const names: ActionNamesType = {};
  types.forEach((type) => {
    names[type] = `${rpcActionName}_${type.toUpperCase()}`;
  });
  return names;
}

type Action<TType, TPayload> = {
  type: TType,
  payload: TPayload,
};
type ConvertToAction = <T>(T) => (payload: any) => Action<T, *>;
type RPCActionsType = $ObjMap<ActionNamesType, ConvertToAction>;
export function createRPCActions(rpcId: string): RPCActionsType {
  const actionNames = createActionNames(rpcId);
  const obj: RPCActionsType = {};
  types.forEach((type) => {
    obj[type] = (payload: any) => {
      return {type: actionNames[type], payload};
    };
  });
  return obj;
}

function getNormalizedReducers<S, A: ActionType>(
  reducers: RPCReducersType<S, A>
): NormalizedRPCReducersType<S, A> {
  const obj: NormalizedRPCReducersType<S, A> = {};
  types.forEach((type) => {
    // $FlowFixMe
    obj[type] = reducers[type] || noopReducer;
  });
  return obj;
}

export function createRPCReducer<S, A: ActionType>(
  rpcId: string,
  reducers: RPCReducersType<S, A>,
  // $FlowFixMe
  startValue: S = {}
): Reducer<S, A> {
  const actionNames = createActionNames(rpcId);
  const normalizedReducers = getNormalizedReducers(reducers);

  return function rpcReducer(state: S = startValue, action: A) {
    if (actionNames.start === action.type) {
      return normalizedReducers.start(state, action);
    }
    if (actionNames.success === action.type) {
      return normalizedReducers.success(state, action);
    }
    if (actionNames.failure === action.type) {
      return normalizedReducers.failure(state, action);
    }
    return state;
  };
}

// TODO(#107): Improve flow types with reactors
export function createRPCReactors<S, A: ActionType>(
  rpcId: string,
  reducers: RPCReducersType<S, A>
): RPCReactorsType<*, *> {
  const actionNames = createActionNames(rpcId);
  const normalizedReducers = getNormalizedReducers(reducers);
  const reactors = types.reduce((obj, type) => {
    if (!normalizedReducers[type]) {
      throw new Error(`Missing reducer for type ${type}`);
    }
    const reactor: () => ReactorAction<*, *> = createReactor(
      actionNames[type],
      (normalizedReducers[type]: any)
    );
    obj[type] = reactor;
    return obj;
  }, {});
  return ((reactors: any): RPCReactorsType<*, *>);
}

// FYI 2018-05-10 - Improve type definition for RPCHandlerType
type RPCHandlerType = (args: any) => any;
export function createRPCHandler({
  actions,
  store,
  rpc,
  rpcId,
  mapStateToParams,
  transformParams,
}: {
  actions?: RPCActionsType,
  store: Store<*, *, *>,
  rpc: any,
  rpcId: string,
  mapStateToParams?: (state: any, args?: any) => any,
  transformParams?: (params: any) => any,
}): RPCHandlerType {
  if (!actions) {
    actions = createRPCActions(rpcId);
  }
  return (args: any) => {
    if (mapStateToParams) {
      args = mapStateToParams(store.getState(), args);
    }
    if (transformParams) {
      args = transformParams(args);
    }
    store.dispatch(actions && actions.start(args));
    return rpc
      .request(rpcId, args)
      .then((result) => {
        try {
          store.dispatch(actions && actions.success(result));
        } catch (e) {
          e.__shouldBubble = true;
          throw e;
        }
        return result;
      })
      .catch((e) => {
        if (e.__shouldBubble) {
          delete e.__shouldBubble;
          throw e;
        }
        const error = Object.getOwnPropertyNames(e).reduce((obj, key) => {
          obj[key] = e[key];
          return obj;
        }, {});
        delete error.stack;
        error.initialArgs = args;
        store.dispatch(actions && actions.failure(error));
        return e;
      });
  };
}
