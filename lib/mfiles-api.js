const axios = require('axios');
const path = require('path');
const fs = require('fs');
const logger = require('../lib/logger');
const config = require('../config/config.json');
const https = require('https');

//Class for MFiles API
class MFilesAPI {
  //Sets URL and headers for API call
  constructor() {
    this.axios = axios.create({
      baseURL: config.MF_API_URL,
      headers: {
        'Content-Type' : 'application/json',
        'X-Authentication': config.MF_AUTH
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });
  }
  //get all documents in Order Document CLASS, Order Document WORKFLOW, and System Process STATE
  async getClassDocs(){
    const inBoundDocs = await this.axios.get('/objects?o=0&p100=33&p38=110&p39=155&limit=0');
    return inBoundDocs.data.Items;
  }
  //get objects Properties
  async getProperties(objects, objectType){
    let objProperties = {};
    for (let object of Object.values(objects)) {
      const objProp = await this.axios.get(`objects/${objectType}/${object.DisplayID}/latest/properties`);
      objProperties[object.DisplayID] = objProp.data;
    }
    return objProperties;
  }
  //get all member objects from M-Files
  async memberObjectsMfiles(){
    const membs = await this.axios.get('/objects?o=103&p100=60&limit=0');
    return membs.data.Items;
  }
   //verify user input member exists in M-Files
   async verifyMember(objProperties){
     // console.log(objProperties);
     for (let object of Object.keys(objProperties)) {
       let barcodeID = 'error';
       let patientID = 'error'
       let dobAPI = '';
       let lastNameAPI = '';
       // get name of object
       const objName = await objProperties[object].filter(o => o.PropertyDef === 0)[0].Value.DisplayValue;
       // barcode ID VER
       const barcodeIdVER = await objProperties[object].filter(o => o.PropertyDef === 1151).map(o => o.Value.Value);
       // Date of Birth VER
       const dobIdVER = await objProperties[object].filter(o => o.PropertyDef === 1153).map(o => o.Value.Value);
       // Last Name VER
       const lastNameVER = await objProperties[object].filter(o => o.PropertyDef === 1152).map(o => o.Value.Value);
       // check if barcode exists
       const barcodeExists = await this.axios.get(`/objects?o=112&p100=27&p1119=${barcodeIdVER[0]}&limit=0`);
       const barcodeArray = barcodeExists.data.Items;
       if(barcodeArray.length > 0){
         barcodeID = barcodeArray[0].DisplayID;
       }
       // check if patient exists
       // dob
       if(dobIdVER[0] != undefined){
         dobAPI = `p1108=${dobIdVER[0]}&`;
       }
       // Last Name
       if(lastNameVER[0] != undefined){
         lastNameAPI = `p1105=${lastNameVER[0]}&`;
       }
       // Check if user filled out at least 1 of the 2
       if(dobAPI == '' && lastNameAPI == ''){
         console.log("Need at least DOB or Last Name filled out.");
       } else {
         const input = dobAPI + lastNameAPI;
         const patientExists = await this.axios.get(`/objects?o=111&p100=26&${input}limit=0`);
         const patientArray = patientExists.data.Items;
         console.log(dobIdVER);
         console.log(lastNameVER[0]);
         if(patientArray.length > 0){
           patientID = patientArray[0].DisplayID;
         }
       }
       // if one of them errored out, error state
       if(barcodeID == 'error' || patientID == 'error'){
         console.log(`Error for Object ID ${object}: barcodeID = ${barcodeID} and patientID = ${patientID}`);
         await this.errorState(object);
       } else {
         // check if this barcode is actually linked to this patient
         const barcodePatientMatch = await this.axios.get(`/objects?o=112&p100=27&p1119=${barcodeIdVER[0]}&p1140=${patientID}&limit=0`);
         console.log(barcodePatientMatch);
         if(barcodePatientMatch.data.Items.length > 0){
           await this.matchDocument(object, objName, barcodeID);
         } else {
           console.log(`Error: No Match for Barcode ${barcodeID} and Patient ${patientID}.`);
           await this.errorState(object);
         }
       }
     }
   }
   //put document in Class and select correct member
   async matchDocument(object, objName, barcodeID){
     const updateData = [
         {
           // Name
           "PropertyDef": 0,
           "TypedValue": { "DataType": 1, "Value": objName}
         },
         {
             // Choose Barcode
             "PropertyDef": 1150,
             "TypedValue": { "DataType": 9, "Lookup": { "Item": barcodeID } }
         },
         {
             // Class: Order Documents
             "PropertyDef": 100,
             "TypedValue": { "DataType": 9, "Lookup": { "Item": 34 } }
         },
         {
             // Multi-File
             "PropertyDef": 22,
             "TypedValue": { "DataType": 8, "Value": true }
         }
       ]
     await this.axios.put(`/objects/0/${object}/latest/properties`, updateData);
   }
  // put document in error state
  async errorState(object){
    const addWorkflow =
      {
          "State":
          {
      		//Change State
              "PropertyDef": 39,
              "TypedValue": { "DataType": 9, "HasValue": true, "Lookup": { "Item": 154 } }
      	  }
      }
    await this.axios.put(`/objects/0/${object}/latest/workflowstate`, addWorkflow);
  }

}

module.exports = MFilesAPI;

// Classes for Incoming Mail
  //
	// - A&G
	// - Brokers
	// - Claims
	// - Compliance
	// - Enrollment
	// - Finance
	// - Legal
	// - Member Services
	// - Wellness Coordinators
