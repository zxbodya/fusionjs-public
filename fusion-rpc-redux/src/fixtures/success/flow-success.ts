import type {Reducer} from 'redux';
import {createRPCReducer} from '../../index';

type UserDataType = {
  firstName: string;
  lastName: string;
};

type ErrorType = {
  message: string;
};

export type UserStateType = {
  loading: boolean;
  data: UserDataType | undefined | null;
  error: ErrorType | undefined | null;
};

export type UserActionType = {
  type: string;
  payload: {
    data: UserDataType | undefined | null;
    error: ErrorType | undefined | null;
  };
};

const UserReducer: Reducer<UserStateType, UserActionType> = createRPCReducer(
  'getUser',
  {
    start: (state) => {
      return {
        ...state,
        loading: true,
      };
    },
    success: (state, action) => {
      return {
        ...state,
        loading: false,
        data: action.payload.data,
      };
    },
    failure: (state, action) => {
      return {
        loading: false,
        data: null,
        error: action.payload.error,
      };
    },
  },
  {
    loading: false,
    data: null,
    error: null,
  }
);

export default UserReducer;
