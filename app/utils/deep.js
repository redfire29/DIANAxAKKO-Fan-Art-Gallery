export const findCategoryDeep = (categories, keyword) => {
  return ((category, key) => {
    const checkLowLowDesc = useFind(category, (o) => {
      return (o.desc ?? o.name).toLowerCase() === key.toLowerCase();
    });
    let tmp = '';
    if (checkLowLowDesc) {
      tmp = checkLowLowDesc;
    } else {
      useForEach(category, (c) => {
        if (c.children) {
          tmp = findCategoryDeep(c.children, key);
          if (tmp) {
            return false;
          }
        }
        return true;
      });
    }
    return tmp;
  })(categories, keyword);
};
export const findPathDeep = (categories, keyword) => {
  return ((category, key) => {
    const checkLowLowDesc = useFind(category, (o) => {
      return useGet(o, 'path', '').toLowerCase() === key.toLowerCase();
    });
    let tmp = '';
    if (checkLowLowDesc) {
      tmp = checkLowLowDesc;
    } else {
      useForEach(category, (c) => {
        if (c.children) {
          tmp = findPathDeep(c.children, key);
          if (tmp) {
            return false;
          }
        }
        return true;
      });
    }
    return tmp;
  })(categories, keyword);
};
