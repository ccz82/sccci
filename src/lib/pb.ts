import Pocketbase from 'pocketbase';
import { type TypedPocketBase } from '~/pocketbase-types.gen';

const pb = new Pocketbase(import.meta.env.VITE_PB_URL) as TypedPocketBase;
pb.autoCancellation(false);

export { pb };
