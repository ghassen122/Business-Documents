import { configureStore } from '@reduxjs/toolkit'
import { templateApi } from './api/templateApi'
import { userApi } from './api/userApi'
import { authApi } from './api/authApi'
import { orderApi } from './api/orderApi'
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [templateApi.reducerPath]: templateApi.reducer,
    [userApi.reducerPath]:     userApi.reducer,
    [authApi.reducerPath]:     authApi.reducer,
    [orderApi.reducerPath]:    orderApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(templateApi.middleware)
      .concat(userApi.middleware)
      .concat(authApi.middleware)
      .concat(orderApi.middleware),
})

export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
