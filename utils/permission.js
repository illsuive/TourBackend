
export const hasResourceAccess = (reqUser, resourceUserId) => {
  if (reqUser.role === 'admin') return true;
  return reqUser._id.toString() === resourceUserId.toString();
};