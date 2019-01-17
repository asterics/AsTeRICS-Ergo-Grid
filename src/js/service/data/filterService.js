import {modelUtil} from "../../util/modelUtil";
import {encryptionService} from "./encryptionService";
import {log} from "../../util/log";

let filterService = {};

/*
Model Version Changelog:
V0 -> V1: Introduction of encryption and modelVersion property on all data models
 */

/**
 * converts "live" objects that are used in memory in the application to objects that are stored to database (encrypted)
 * @param objects the object or objects to be converted, can be a singe object or an array,
 *        must be an instance of an object model defined in model package
 * @param filterOptions object of filter options that is passed to each filter function
 * @return object of list of objects that is/are ready for saving to database
 */
filterService.convertLiveToDatabaseObjects = function (objects, filterOptions) {
    log.debug('conversion to database - before filters:', objects);
    let filtered = filterObjects(objects, filterOptions, getFilterFunctionsToDatabase);
    log.debug('conversion to database - after filters:', filtered);
    return filtered;
};

/**
 * converts objects from database to "live" objects in memory that are used by the application (unencrypted)
 * @param objects the object or objects to be converted, can be a singe object or an array
 * @param filterOptions object of filter options that is passed to each filter function
 * @return object of list of objects that is/are ready for using in the application
 */
filterService.convertDatabaseToLiveObjects = function (objects, filterOptions) {
    log.debug('conversion to live - before filters:', objects);
    let filtered = filterObjects(objects, filterOptions, getFilterFunctionsFromDatabase);
    log.debug('conversion to live - after filters:', filtered);
    return filtered;
};

/**
 * filters (converts) given objects.
 *
 * @param objects the objects to filter, can be a singe object or an array
 * @param filterOptions object of filter options that is passed to each filter function
 * @param getFilterFunctionsFunction a function that returns an array of filter functions that should be used for
 *        filtering. A Filter function is a function that takes two parameters "object" and "filterOptions" and returns
 *        a filtered/converted object.
 *
 * @return {*} a list of filtered/converted objects
 */
function filterObjects(objects, filterOptions, getFilterFunctionsFunction) {
    objects = objects instanceof Array ? objects : [objects];
    for (let i = 0; i < objects.length; i++) {
        let filterFunctions = getFilterFunctionsFunction(modelUtil.getModelVersionObject(objects[i].modelVersion));
        filterFunctions.forEach(filterFn => {
            objects[i] = filterFn(objects[i], filterOptions);
        });
    }
    return objects.length > 1 ? objects : objects[0];
}

/**
 * returns a list of filters that are applied before saving an object to the database.
 * @param objectModelVersion the model version of the object to filter/convert
 * @return {Array} list of filters that should be applied to the object
 */
function getFilterFunctionsToDatabase(objectModelVersion) {
    let filterFns = getModelConversionFunctions(objectModelVersion);
    filterFns.push(encryptionService.encryptObject); // encryption is last step before saving to database
    return filterFns;
}

/**
 * returns a list of filters that are applied after getting an object from database.
 * @param objectModelVersion the model version of the object to filter/convert
 * @return {Array} list of filters that should be applied to the object
 */
function getFilterFunctionsFromDatabase(objectModelVersion) {
    let filterFns = getModelConversionFunctions(objectModelVersion);
    if (objectModelVersion.major) { //before introduction of objectModel version there was no encryption, so no need of decryption
        filterFns.unshift(encryptionService.decryptObjects); //decryption is first step before other conversions
    }
    return filterFns;
}

/**
 * returns a list of filter functions that are needed to apply to convert a given object with modelVersion
 * "objectMajorModelVersion" to the latest modelVersion.
 * @param objectModelVersion the model version of the object
 * @return {Array} list of functions to be applied to bring the object to the current modelVersion
 */
function getModelConversionFunctions(objectModelVersion) {
    if(objectModelVersion.major === modelUtil.getLatestModelVersion().major) {
        return [];
    }

    let filterFns = [];
    //after adding a breaking modelVersion Change just uncomment the following switch statement and
    //insert a conversion function from major version 1 to major version 2
    //for more conversions switch fallthrough is intended - all needed conversion functions are added
    /*
    switch (objectModelVersion.major) {
        case 1:
            filterFns.push(function (object, filterOptions) { //fn from V1 to V2
                //implement
            });
        //no break intended!
        case 2:
            filterFns.push(function (object, filterOptions) { //fn from V2 to V3

            });

    }
    */
    filterFns.push(function (object, filterOptions) { //update to current modelVersion after all conversions
        object.modelVersion = modelUtil.getModelVersionString();
        return object;
    });
    return filterFns;
}

export {filterService};