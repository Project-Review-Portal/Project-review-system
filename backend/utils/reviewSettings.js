const Config = require('../models/Config');

/**
 * Returns the list of valid slotTypes based on the Config for a given programme.
 * e.g. if numReviews=3 and vivaRequired=true => ['review1','review2','review3','viva']
 *      if numReviews=2 and vivaRequired=false => ['review1','review2']
 * @param {string|null} programme - The programme name to scope the config lookup.
 */
const getReviewSettings = async (programme = null) => {
    const filter = programme ? { programme } : {};
    const config = await Config.findOne(filter);
    const numReviews = (config && config.numReviews) ? config.numReviews : 3;
    const vivaRequired = config ? config.vivaRequired : true;

    const validSlotTypes = ['review0'];
    for (let i = 1; i <= numReviews; i++) {
        validSlotTypes.push(`review${i}`);
    }
    if (vivaRequired) {
        validSlotTypes.push('viva');
    }

    return { numReviews, vivaRequired, validSlotTypes };
};

module.exports = { getReviewSettings };
