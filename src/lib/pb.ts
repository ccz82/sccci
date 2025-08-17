import Pocketbase from 'pocketbase'
import { type TypedPocketBase } from '~/pocketbase-types.gen'

export const pb = new Pocketbase(import.meta.env.VITE_PB_URL) as TypedPocketBase
