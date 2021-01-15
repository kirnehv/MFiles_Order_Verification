const { MFilesAPI, Mail} = require('../lib');
const { MemberObjects } = require('../lib');
const { EZCapQuery } = require('../lib');
const logger = require('../lib/logger');
const os = require('os');
//declare objects to access classes
const api = new MFilesAPI();
const mail = new Mail();

async function main() {
  //get all objects in Inbound Mail Class
  const inBoundDocs = await api.getClassDocs();
  if (inBoundDocs.length < 1 || inBoundDocs == null){
    logger.log("No documents to process.");
    console.log("No documents to process.");
  } else {
    //get properties for objects in System Process state
    const objProperties = await api.getProperties(inBoundDocs, 0);
    //get all memebers
    // const memberObjects= await api.memberObjectsMfiles();
    //get all member properties
    // const memProperties = await api.getProperties(memberObjects, 103);
    //compare user input to DB (does member exist by ID and DOB)
    // await api.verifyMember(objProperties, memProperties);
    await api.verifyMember(objProperties);
  }
}
//run main, log All Done to console, log error to logger file
process.on('unhandledRejection', logger.error);

main()
  .catch(async error => {
    // log error to logger
    await logger.fatal(error);
    // send error as mail
    await mail.sendMail(error.stack);
  })
  .catch(logger.fatal)
  .finally(async () => {
    logger.info("Program finished.");
  });
