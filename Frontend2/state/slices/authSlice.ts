import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  user: { id: string; name: string; email: string } | null
  hydrated: boolean
}

const initialState: AuthState = {
  user: null,
  hydrated: false,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthState['user']>) {
      state.user = action.payload
      state.hydrated = true
    },
    clearUser(state) {
      state.user = null
      state.hydrated = true
    },
  },
})

export const { setUser, clearUser } = authSlice.actions
export default authSlice.reducer
