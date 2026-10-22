import { ALL_ADMIN_ROLES } from '../../utils/roles.js';
import { logger } from '../../utils/logger.js';

// `CheckAdminExist` is used to check is admin with org exist or not in db
export default async function CheckAdminExist() {
  try {
    const extClsQuery = new Parse.Query('contracts_Users');
    extClsQuery.containedIn('UserRole', ALL_ADMIN_ROLES);
    extClsQuery.notEqualTo('IsDisabled', true);
    const extAdminRes = await extClsQuery.find({ useMasterKey: true });
    // must be only one admin
    if (extAdminRes && extAdminRes.length === 1 && extAdminRes?.[0]?.get('OrganizationId')) {
      return 'exist';
    } else {
      return 'not_exist';
    }
  } catch (err) {
    logger.info('err in isAdminExist', err);
    const code = err?.code || 400;
    const msg = err?.message || 'something went wrong.';
    throw new Parse.Error(code, msg);
  }
}
