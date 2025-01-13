/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
|
| The HTTP kernel file is used to register the middleware with the server
| or the router.
|
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

/**
 * The error handler is used to convert an exception
 * to a HTTP response.
 */
server.errorHandler(() => import('#exceptions/handler'))

/**
 * The server middleware stack runs middleware on all the HTTP
 * requests, even if there is no route registered for
 * the request URL.
 */
server.use([
  () => import('#middleware/container_bindings_middleware'),
  () => import('@adonisjs/static/static_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
  () => import('@adonisjs/vite/vite_middleware'),
  () => import('@adonisjs/inertia/inertia_middleware'),
])

/**
 * The router middleware stack runs middleware on all the HTTP
 * requests with a registered route.
 */
router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/session/session_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
])

/**
 * Named middleware collection must be explicitly assigned to
 * the routes or the routes group.
 */
export const middleware = router.named({
  countOnlineUsers: () => import('#middleware/count_online_users_middleware'),
  convertObfuscatedIdToFolderId: () =>
    import('#middleware/convert_obfuscated_id_to_folder_id_middleware'),
  convertObfuscatedIdToEntityGroupId: () =>
    import('#middleware/convert_obfuscated_id_to_entity_group_id_middleware'),
  checkUserManagementPermission: () =>
    import('#middleware/check_user_management_permission_middleware'),
  checkPermissionLetter: () => import('#middleware/check_permission_letter_middleware'),
  checkFolderOrFileCreationOrDeletePermission: () =>
    import('#middleware/check_folder_or_file_creation_or_delete_permission_middleware'),
  guest: () => import('#middleware/guest_middleware'),
  auth: () => import('#middleware/auth_middleware'),
})
