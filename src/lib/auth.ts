import { pb } from './pb'
import { ParsedLocation, redirect } from '@tanstack/react-router'

export function protectPage(location: ParsedLocation) {
  if (!pb.authStore.isValid) {
    throw redirect({ to: '/signin', search: { redirect: location.href } })
  } else if (!pb.authStore.record?.verified) {
    throw redirect({ to: '/verify-account' })
  }
}
