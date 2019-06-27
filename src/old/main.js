
'use strict';

/**
 * @OnlyCurrentDoc
 */


function getSurveyString(){  
  var settings = getSettings(); //settings: separator, doubleQuote, escapeCode, useIndexes, useTitleRow
  var formBase = {};
  Logger.log("Getting form base elements as JSON...");
  formBase = getFormBase();// JSON with form base elements
  
  Logger.log("Getting current form responses...");
 
  var alljson = getResponses(formBase);// JSON with form base elements, in
  
  
  Logger.log("Transforming complete JSON into string according to settings...");
  var finalstring = convertJSONToCSV(alljson, settings);
  return finalstring;
}

/* Appends responses to final JSON object */
function getResponses(basejson){
  // formIDs is array of IDs of valid/skipped/faulty IDs of source forms sheet
  // itemResponses is array of responses for questions of the form (single response sheet)
  var form = FormApp.getActiveForm();
  var formResponses = form.getResponses();
  var finaljson = {};
  
  for(var k = 0; k < formResponses.length; k++){
    Logger.log("Going through form response index: "+k);
    var ftempjson = JSON.parse(JSON.stringify(basejson));
    
    var itemResponses = formResponses[k].getItemResponses();// itemResponses array of 1 form response
    var respEmail = formResponses[k].getRespondentEmail();
    var respTS = formResponses[k].getTimestamp();
    var respID = formResponses[k].getId();
    
    ftempjson.meta = {};
    ftempjson.meta.email = respEmail;
    ftempjson.meta.timestamp = respTS;
    ftempjson.meta.id = respID;
    
    for(var i = 0; i < itemResponses.length; i++){
      var itemRes = itemResponses[i]; // single item in 1 form itemResponses array
      //        key          obj
      for(var baseelem in ftempjson){// loop through 0....n elements in form basejson
        if(baseelem === "meta"){
          // no need to handle "meta" details of form answers
          continue;
        }
        var baseid = ftempjson[baseelem].id;// id of currently looped element
        var itemResId = itemRes.getItem().getId();// get item tied to answer, and then its ID
        if(itemResId === baseid){
          //found correct base item in list, now need to get answer(string and index) and append them to final json subobject
          var getAns = getItemAnswers(itemRes.getResponse(),ftempjson[baseelem]);// array. 0 = array of numeric, 1 = array of string answer
          ftempjson[baseelem]["ansNum"] = getAns[0];// array of numbers
          ftempjson[baseelem]["ansString"] = getAns[1];// array of strings
          break;
        }
      }// finaljson[k] for loop end
      
    }// itemResponses for loop end
    try{
      finaljson[k] = JSON.parse(JSON.stringify(ftempjson));
    } catch(err){
      console.error("Error in getResponses(): "+err.message);
      finaljson[k] = ftempjson;
    }
  }// formResponses for loop end
  return finaljson;
}

function findpos (arr, char){
  var index = 0;
  try{
    index = arr.indexOf(char);
  }catch(err){
    console.error("Error in findpos(): "+err.message);
    index = -1;
  }
    return index;
}

/* Returns answer for itemResponse */
function getItemAnswers (response, element){// response is itemRes.getResponse(), element is current element from basejson object
  /////////////////////// returns [numeric/array of numbers, string/array of strings]
  var choices = element.choices;
  var type = element.type;
  var returnArr = [];
     try{
     switch(type){
         case "CHECKBOX":
         //code
         // hasOtherOption() >>>>> Boolean
         // getChoices() >>>> Choice[]
         // Returns String[]
         
         var cb_ansarr_int = [];
         var cb_ansarr_str = [];
         for(var cb_1 = 0; cb_1 < response.length;cb_1++){
           var cb_1_a = response[cb_1];
           // welp, since this returns -1, if not found, we don't need cb_check :P
           var cb_1_index = findpos(choices, cb_1_a);
           
           cb_ansarr_int.push(cb_1_index);
           cb_ansarr_str.push(cb_1_a);
             }
         returnArr.push(cb_ansarr_int, cb_ansarr_str);
         //Logger.log("############ CHECKBOX ############");
         
         break;
       case "MULTIPLE_CHOICE":
         //code
         // getChoices() >>>>>>> Choice[]
         // hasOtherOption() >>>>>>> Boolean
         
         // response is already string answer...
         var mc_ansindex = findpos(choices, response);
         returnArr.push(mc_ansindex, response);
         //Logger.log("############ MULTIPLE_CHOICE ############");
         
         break;
       case "LIST":
         //code
         // getChoices() >>>>> Choice[]
         
         var list_ansindex = findpos(choices, response);     
         returnArr.push(list_ansindex, response);
         
         //Logger.log("############ LIST ############");
         //elem = itemResponse.getItem().asListItem();
         
         break;
       case "CHECKBOX_GRID":
         //code
         // Returns String[][] !!!!!!!!
         // getColumns() >>>> String[]
         // getRows() >>>>>> String[]
         var cbg_row = element.rows;
         var cbg_col = element.columns;
         returnArr.push([],[]);
         
         for(var cbg_1 = 0;cbg_1 < response.length;cbg_1++){
           //looping rows...
           if(response[cbg_1] === null){
             // row didn't have answers!
             returnArr[0].push(null);
             returnArr[1].push(null);
             continue;
           }
           var cbg_a1 = [];// numbers
           var cbg_a2 = [];// strings
           
           for(var cbg_2 = 0;cbg_2 < response[cbg_1].length;cbg_2++){
             // looping one line of ticked answers
             var cbg_index = findpos(cbg_col, response[cbg_1][cbg_2]);
             cbg_a1.push(cbg_index);
             cbg_a2.push(response[cbg_1][cbg_2]);
           }
           returnArr[0].push(cbg_a1);
           returnArr[1].push(cbg_a2);
         }
         
         //Logger.log("############ CHECKBOX_GRID ############");
         
         break;
       case "GRID":
         //code
         // Returns String[] !!!!!!!!!!
         // getColumns() >>>> String[]
         // getRows() >>>>>> String[]
         var gr_row = element.rows;
         var gr_col = element.columns;
         
         returnArr.push([],[]);
         
         for(var gr_1 = 0;gr_1 < response.length;gr_1++){
           //looping columns...
           if(response[gr_1] === null){
             // column didn't have answers!
             returnArr[0].push(null);
             returnArr[1].push(null);
             continue;
           }
           var gr_a1 = findpos(gr_col, response[gr_1]);;// numbers
           var gr_a2 = response[gr_1];// strings
           /*
           for(var cbg_2 = 0;cbg_2 < response[cbg_1].length;cbg_2++){
             // looping one line of ticked answers
             var cbg_index = findpos(cbg_col, response[cbg_1][cbg_2]);
             cbg_a1.push(cbg_index);
             cbg_a2.push(response[cbg_1][cbg_2]);
           }*/
           returnArr[0].push(gr_a1);
           returnArr[1].push(gr_a2);
         }
          
         //Logger.log("############ GRID ############");
          
         break;
       case "DATE":
         //code
         // includesYear() >>>>> Boolean
         returnArr.push(null, response);
         
         //Logger.log("############ DATE ############");
         
         break;
       case "DATETIME":
         //code
         // includesYear() >>>>> Boolean
         
         returnArr.push(null, response);
         //Logger.log("############ DATETIME ############");
         
         break;
       case "DURATION":
         //code
         
         returnArr.push(null, response);
         //Logger.log("############ DURATION ############");
         
         break;
       case "IMAGE":
         //code ##########################
         returnArr.push(null, null);
         //Logger.log("############ IMAGE ############");
         
         // SKIP
         
         break;
       case "VIDEO":
         //code ##########################
         returnArr.push(null, null);
         //Logger.log("############ VIDEO ############");
         
         // SKIP
         
         break;
       case "PAGE_BREAK":
         returnArr.push(null, null);
         //Logger.log("############ PAGE_BREAK ############");
         
         // SKIP
         //code ###############################
         
         break;
       case "PARAGRAPH_TEXT":
         
         returnArr.push(null, response);
         //Logger.log("############ PARAGRAPH_TEXT ############");
         //code
         
         break;
       case "SCALE":
         //Logger.log("############ SCALE ############");
         //code
         // getUpperBound() >>>>> Integer
         // getLowerBound() >>>>> Integer
         var parsedInt = parseInt(response);
         if(isNaN(parsedInt)){
           // not a number
           parsedInt = null;
         }
         returnArr.push(parsedInt, response);
         
         break;
       case "SECTION_HEADER":
         
         returnArr.push(null, null);
         //Logger.log("############ SECTION_HEADER ############");
         
         // SKIP
         
         break;
       case "TEXT":
         //code
         returnArr.push(null, response);
         //Logger.log("############ TEXT ############");
         
         break;
       case "TIME":
         //code
         
         returnArr.push(null, response);
         //Logger.log("############ TIME ############");
         
         break;
       default:
         // Default. This means that the question type was something special, or invalid....
         returnArr.push(null, null);
         //Logger.log("############ INVALID!!! DEFAULT!!! ############");
         console.warn("getItemAnswers(): Question type unknown or invalid! Type was '%s'",type.toString());
       
     }
     } catch(err){
       // there was error, for example scripting error with getItem().asXXXXItem();
       //Logger.log("Error while getting form answer data!");
       //Logger.log(err);
       console.error("Error in getItemAnswers(): "+err.message);
       returnArr.push(null, null);
     }
     //
  
  return returnArr;
}

/* This function returns JSON with all form base elements */
function getFormBase(){
  var form = FormApp.getActiveForm(); // get current, open/active google form reference
  var elems = form.getItems();//array of items in form base
  // getIndex() <<<<<<<<<<<
  var data = {}
  /*
  {
  0:{
  "invalid": false,
  "type":*type*,
  "id": 12312424,
  "choices":[], (not necessarily)
  "hasOther": true, (not necessarily)
  "includesYear": true, (not necessarily)
  "columns": [], (not necessarily)
  "rows": [], (not necessarily)
  "upperBound": 123123, (not necessarily)
  "lowerBound": 3456 (not necessarily)
  }
  }
  
  */
  
  for(var i = 0;i<elems.length;i++){
    // loop through survey elems...
    
    data[i] = {};
    try{
    switch(elems[i].getType()){
       case FormApp.ItemType.CHECKBOX:
        elems[i] = elems[i].asCheckboxItem();
         //code
         // hasOtherOption() >>>>> Boolean
         // getChoices() >>>> Choice[]
         //Logger.log("############ CHECKBOX ############");
         // Returns String[]
        data[i].invalid = false;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "CHECKBOX";
        data[i].id = elems[i].getId();
        data[i].choices = elems[i].getChoices();
        for(var cbc = 0;cbc<data[i].choices.length;cbc++){
          data[i].choices[cbc] = data[i].choices[cbc].getValue();
        }
        data[i].hasOther = elems[i].hasOtherOption();
         
         break;
       case FormApp.ItemType.MULTIPLE_CHOICE:
        elems[i] = elems[i].asMultipleChoiceItem();
         //code
         // getChoices() >>>>>>> Choice[]
         // hasOtherOption() >>>>>>> Boolean
         //Logger.log("############ MULTIPLE_CHOICE ############");
        data[i].invalid = false;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "MULTIPLE_CHOICE";
        data[i].id = elems[i].getId();
        data[i].choices = elems[i].getChoices();
        for(var mcc = 0;mcc<data[i].choices.length;mcc++){
          data[i].choices[mcc] = data[i].choices[mcc].getValue();
        }
        data[i].hasOther = elems[i].hasOtherOption();
         
         break;
       case FormApp.ItemType.LIST:
        elems[i] = elems[i].asListItem();
         //code
         //Logger.log("############ LIST ############");
        data[i].invalid = false;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "LIST";
        data[i].id = elems[i].getId();
        data[i].choices = elems[i].getChoices();
        for(var lic = 0;lic<data[i].choices.length;lic++){
          data[i].choices[lic] = data[i].choices[lic].getValue();
        }

         break;
       case FormApp.ItemType.CHECKBOX_GRID:
        elems[i] = elems[i].asCheckboxGridItem();
         //code
         //Logger.log("############ CHECKBOX_GRID ############");
         // Returns String[][] !!!!!!!!
        data[i].invalid = false;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "CHECKBOX_GRID";
        data[i].id = elems[i].getId();
        data[i].columns = elems[i].getColumns();
        data[i].rows = elems[i].getRows(); 
        
         break;
       case FormApp.ItemType.GRID:
        elems[i] = elems[i].asGridItem();
         //code
         //Logger.log("############ GRID ############");
        data[i].invalid = false;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "GRID";
        data[i].id = elems[i].getId();
        data[i].columns = elems[i].getColumns();
        data[i].rows = elems[i].getRows();
         
         break;
       case FormApp.ItemType.DATE:
        elems[i] = elems[i].asDateItem();
         //code
         //Logger.log("############ DATE ############");
         // includesYear() >>>>> Boolean
        data[i].invalid = false;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "DATE";
        data[i].id = elems[i].getId();
        data[i].includesYear = elems[i].includesYear();
        
         break;
       case FormApp.ItemType.DATETIME:
        elems[i] = elems[i].asDateTimeItem();
         //code
         //Logger.log("############ DATETIME ############");
         // includesYear() >>>>> Boolean
        data[i].invalid = false;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "DATETIME";
        data[i].id = elems[i].getId();
        data[i].includesYear = elems[i].includesYear();
        
         break;
       case FormApp.ItemType.DURATION:
        elems[i] = elems[i].asDurationItem();
         //code
         //Logger.log("############ DURATION ############");
        data[i].invalid = false;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "DURATION";
        data[i].id = elems[i].getId();
        
         break;
       case FormApp.ItemType.IMAGE:
        elems[i] = elems[i].asImageItem();
         //code ##########################
         //Logger.log("############ IMAGE ############");
        data[i].invalid = true;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "IMAGE";
        data[i].id = elems[i].getId();
        
         break;
       case FormApp.ItemType.PAGE_BREAK:
        elems[i] = elems[i].asPageBreakItem();
        // Logger.log("############ PAGE_BREAK ############");
         //code ###############################
        data[i].invalid = true;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "PAGE_BREAK";
        data[i].id = elems[i].getId();
        
         break;
       case FormApp.ItemType.PARAGRAPH_TEXT:
        elems[i] = elems[i].asParagraphTextItem();
         Logger.log("############ PARAGRAPH_TEXT ############");
        data[i].invalid = false;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "PARAGRAPH_TEXT";
        data[i].id = elems[i].getId();
        
         break;
       case FormApp.ItemType.SCALE:
        elems[i] = elems[i].asScaleItem();
         //Logger.log("############ SCALE ############");
        data[i].invalid = false;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "SCALE";
        data[i].id = elems[i].getId();
        data[i].upperBound = elems[i].getUpperBound();
        data[i].lowerBound = elems[i].getLowerBound();
        
         break;
       case FormApp.ItemType.SECTION_HEADER:
        elems[i] = elems[i].asSectionHeaderItem();
         //Logger.log("############ SECTION_HEADER ############");
         //code ######################
        data[i].invalid = true;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "SECTION_HEADER";
        data[i].id = elems[i].getId();
        
         break;
       case FormApp.ItemType.TEXT:
        elems[i] = elems[i].asTextItem();
         //code
         //Logger.log("############ TEXT ############");
        data[i].invalid = false;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "TEXT";
        data[i].id = elems[i].getId();
        
         break;
       case FormApp.ItemType.TIME:
        elems[i] = elems[i].asTimeItem();
         //code
         //Logger.log("############ TIME ############");
        data[i].invalid = false;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "TIME";
        data[i].id = elems[i].getId();
        
         break;
      case FormApp.ItemType.VIDEO:
        //code
        elems[i] = elems[i].asVideoItem();
         //code ##########################
         //Logger.log("############ VIDEO ############");
        data[i].invalid = true;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = "VIDEO";
        data[i].id = elems[i].getId();
        break;
       default:
         // Default. This means that the question type was something special, or invalid....
         //Logger.log("############ INVALID!!! DEFAULT!!! ############");
        data[i].invalid = true;
        data[i].title = elems[i].getTitle();// NEW ADDITION
        data[i].type = null;
        data[i].id = elems[i].getId();
        console.warn("getFormBase(): Question type unknown or invalid! Type was '"+elems[i].getType().toString()+"'");
        
    }
    }catch(err){
      //
      //Logger.log("Error while looping form base elements!");
      //Logger.log(err.message);
      console.error("Error in getFormBase(): "+err.message);
    }
      }
  
  return data;
}

/* Sanitize given string, if settings say so */
function formatString(string, settings, mode){// need new mode for ' separator... WORK IN PROGRESS!!!!!!!!!!!!
  if(string === undefined || typeof(string) != typeof("this_is_string")){
    return null;
  } else{
    var dqregex = /["]/g;
    var dqregex_optional = /[']/g;// for optional mode
    var replacements = [
      [/[&]/g, '&amp;'],
      [/[<]/g, '&lt;'],
      [/[>]/g, '&gt;'],
      [/[$]/g, '&dollar;'],
      [/["]/g, '&quot;']
       ];
    var article = string;
    if(mode != undefined && mode === 123){// we are handling title row string. no need to escape as actual data would
      string = string.replace(dqregex, '""');
    }else if(mode != undefined && mode === 456){// multiple string in same csv field
      string = string.replace(dqregex_optional, "''");
      string = string.replace(dqregex, '""');
    }else if(parseBool(settings.escapeCode)){
      // escape all script characters, like < and >
      for (var qwe = 0; qwe < replacements.length; qwe++) {
        var replacement = replacements[qwe];
        string = string.replace(replacement[0], replacement[1]);
      }
    } else{
      // we don't have setting to escape potential code! Checking if wanted to use double quotes...
      if(parseBool(settings.useDoubleQuotes)){
        // change all " into "" in source string
        string = string.replace(dqregex, '""');
      }
    }
    
    return string;
  }
}

/* Converts incoming json object into one string based on settings */
function convertJSONToCSV(json, settings){
  //settings: separator, escapeCode, useDoubleQuotes, useIndexes, useTitleRow, useEmail, useTimeStamp, useID, newline
  /*
  
  {
  // form response
  0:{
  ///////// form items
  // .meta.email / timestamp / id
  0:{
  "title": "Title question name here"
  "invalid": false,
  "type":*type*,
  "id": 12312424,
  "choices":[], (not necessarily)
  "hasOther": true, (not necessarily)
  "includesYear": true, (not necessarily)
  "columns": [], (not necessarily)
  "rows": [], (not necessarily)
  "upperBound": 123123, (not necessarily)
  "lowerBound": 3456 (not necessarily)
  "ansNum": []
  "ansString": []
  }
  }
  }
  
  */
  var fins = "";// final string
  var titlerow = "";// need place to save titles for elements
  var separator = "";
  var separator_list = "";
  var newline = "";
    switch(parseInt(settings.separator)){
      case 0:
        //
        separator = ",";
        separator_list = ";";
        break;
      case 1:
        //
        separator = ";";
        separator_list = ",";
        break;
      default:
        //
        separator = ",";
        separator_list = ";";
    }
  switch(parseInt(settings.newline)){
      case 0:
        //
        newline = "\r\n";
        break;
      case 1:
        //
        newline = "\n";
        break;
      default:
        //
        newline = "\r\n";
    }
  
  if(parseBool(settings.useID)){
    if(titlerow.length === 0){
      titlerow = titlerow.concat('Response ID');
    }else{
      titlerow = titlerow.concat(separator,'Response ID');
    }
  }
  if(parseBool(settings.useTimeStamp)){
    if(titlerow.length === 0){
      titlerow = titlerow.concat('Response timestamp');
    }else{
      titlerow = titlerow.concat(separator,'Response timestamp');
    }
  }
  if(parseBool(settings.useEmail)){
    if(titlerow.length === 0){
      titlerow = titlerow.concat('Respondent email');
    }else{
      titlerow = titlerow.concat(separator,'Respondent email');
    }
  }
  
  // Titlerow first lines (id, timestamp, email) set up based on user settings...
  var sheet_id = 0;
  for(var survey in json){
    //Logger.log("Looping survey in json: "+survey);
    //Logger.log("Sheet: "+sheet_id);
    survey = json[survey];
    // one survey sheet results
    var temps = ""; // one full "row" in CSV file (as string)
    var itemlength = Object.keys(survey).length - 1;// because we don't need "meta" data; amount of items in survey base
    var email = survey.meta.email;
    var resid = survey.meta.id;
    var timestamp = survey.meta.timestamp;
    
    ////////////////////////////////////////////// SETTING ID, EMAIL AND TIMESTAMP TO TEMPS STRING (based on settings)
    if(parseBool(settings.useID)){
      if(temps.length === 0){
        temps = temps.concat('"',formatString(resid,settings,123),'"');
      }else{
        temps = temps.concat(separator,'"',formatString(resid,settings,123),'"');
      }
    }
    if(parseBool(settings.useTimeStamp)){
      if(temps.length === 0){
        temps = temps.concat(timestamp);
      }else{
        temps = temps.concat(separator,timestamp);
      }
    }
    if(parseBool(settings.useEmail)){
      if(temps.length === 0){
        if(email.length === 0 || email === null){
          temps = temps.concat("NO_EMAIL");
        } else{
          temps = temps.concat('"',formatString(email,settings,123),'"');
        }
      }else{
        if(email.length === 0 || email === null){
          temps = temps.concat(separator,"NO_EMAIL");
        } else{
          temps = temps.concat(separator,'"',formatString(email,settings,123),'"');
        }
      }
    }
    /////////////////////////////////////////////////////
    
    for(var itemid = 0; itemid < itemlength; itemid++){// loop through sheet n items x...n w/ responses
      //one item in single sheet; they should have integers 0...n as keys
      //
      // NOTE!!!! Need to set values to "titlerow" array during the first round...
      //
      var curitem = survey[itemid];
      //Logger.log("CURITEM_TYPE: "+curitem.type);
      if(curitem === undefined){
        //Logger.log("ERROR! No element undefined while looping through survey response content! ID:"+itemid);
        //console.error("convertJSONtoCSV(): ");
        //Logger.log("CURITEM WAS UNDEFINED! continue...");
        continue;
      }
      if(curitem.invalid || curitem.invalid === undefined){
        // element invalid, skipping
        //Logger.log("CURITEM WAS INVALID! continue...");
        continue;
      }
      
      if(sheet_id === 0){// first sheet
        // we are on first run...
        ////////////////////////////////////////////////////////////////////////////////////////// CHECKBOX_GRID GRID CUSTOMIZATION FOR rows (titles)! //////////////////////////////////////////////////////////////
        if(titlerow.length === 0){// setting current item title
          var titrowstr1 = curitem.title;
          if(titrowstr1 === null || titrowstr1 === undefined || titrowstr1.length === 0){titrowstr1 = "NO_TITLE"; titlerow = titlerow.concat(titrowstr1);}
          else{titlerow = titlerow.concat('"',formatString(titrowstr1,settings,123), '"');}
          if(parseBool(curitem.hasOther) && !(curitem.hasOther === undefined)){
            //
            titlerow = titlerow.concat("OTHER");
          }
        } else{
          var titrowstr2 = curitem.title;
          if(titrowstr2 === null || titrowstr2 === undefined || titrowstr2.length === 0){titrowstr2 = "NO_TITLE";titlerow = titlerow.concat(separator,titrowstr2);}
          else{titlerow = titlerow.concat(separator,'"',formatString(titrowstr2,settings,123), '"');}
          if(parseBool(curitem.hasOther) && !(curitem.hasOther === undefined)){
            //
            titlerow = titlerow.concat(separator,"OTHER");
          }
        }
        
        
          if(curitem.type == "CHECKBOX_GRID" || curitem.type == "GRID"){// first sheet only; adding new rows to titlerow
                  //var rowleng3 = curitem.rows.length;
                  var titrowstr3 = curitem.title;
                  var titrowcheckcbgrid = false;
                  if(titrowstr3 === null || titrowstr3 === undefined || titrowstr3.length === 0){titrowstr3 = "NO_TITLE"; titrowcheckcbgrid = true;}
            for(var titlerowstr3_row = 1; titlerowstr3_row < curitem.rows.length; titlerowstr3_row++){
                  var titrowstr3_1 = titrowstr3.concat("[ROW_",(titlerowstr3_row+1),"]");
              if(titlerow.length === 0){
                  if(titrowcheckcbgrid){
                    titlerow = titlerow.concat(formatString(titrowstr3_1,settings,123));
                  }else{
                    titlerow = titlerow.concat('"',formatString(titrowstr3_1,settings,123), '"');
                  }}else{
                  if(titrowcheckcbgrid){
                    titlerow = titlerow.concat(separator,formatString(titrowstr3_1,settings,123));
                  }else{
                    titlerow = titlerow.concat(separator,'"',formatString(titrowstr3_1,settings,123), '"');
                  }
                  }
          }
                }
          
        
      }
      if(curitem.ansNum === undefined){
        // there is no data for this element, so ansNum was never assigned
        
        /////////////////////////////////////////////////////////////// HOOOOOOOOOOOOOLD ON! CHECKBOX_GRID or GRID need multiple separators for rows! //////////////////////////////////////////////////////////////
        // check if type is checkbox_grid or grid, and add separators for each row here before continuing....
        Logger.log("ANSNUM WAS NOT DEFINED! continue.....");
        if(curitem.type == "CHECKBOX_GRID" || curitem.type == "GRID"){
          //
          for(var optionalrownro = 0; optionalrownro < curitem.rows.length; optionalrownro++){
            //
            temps = temps.concat(separator);
          }
        }else{
        temps = temps.concat(separator);
        }
        continue;
      }
      
      // taking data from current element...
      
      //"ansNum": # VARIABLE
      //"ansString": # VARIABLE
      if(!(temps.length === 0)){// adding separator to end of datarow, if there is previoius content...
        temps = temps.concat(separator);
      }
      //   escapeCode, useDoubleQuotes, useIndexes
      //    formatString(string, settings, mode)
      switch(curitem.type){
       case "CHECKBOX":
         //code
         // hasOtherOption() >>>>> Boolean
         // getChoices() >>>> Choice[]
         //Logger.log("############ CHECKBOX ############");
         // Returns String[]
          //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// NEED TO RECHECK ALL UNDER HERE!!!!
          if(parseBool(curitem.hasOther)){// element has possibility for "other"
            var tempstringcb = "";
            temps = temps.concat('"');// OPTIONAL
            for(var cbt1 = 0; cbt1 < curitem.ansNum.length; cbt1++){
              switch(cbt1){
                case 0:
                  // do nothing, we have our first element!
                  break;
                default:
                  // add separator for list
                  temps = temps.concat(separator_list);
              }
              if(parseBool(settings.useIndexes)){// use indexes, with "other"
                if(curitem.ansNum[cbt1] === -1){// write down "other" variable
                  tempstringcb = formatString(curitem.ansString[cbt1], settings);
                }
                temps = temps.concat(curitem.ansNum[cbt1]);// using index for other here, too
              ///////////////
              } else{// don't use indexes, with "other"
                if(curitem.ansNum[cbt1] === -1){// write down "other" variable
                  tempstringcb = formatString(curitem.ansString[cbt1], settings);
                  temps = temps.concat("OTHER");
                } else{
                  temps = temps.concat("'",formatString(curitem.ansString[cbt1], settings, 456),"'");
                }
              }
            }// end of for loop (of selected items)
            temps = temps.concat('"');// OPTIONAL
            // add thing for titlerow, and "other" string to datarow
            if(tempstringcb.length === 0){
              temps = temps.concat(separator);
            }else{
              temps = temps.concat(separator, '"',tempstringcb, '"');// add tempstring to datarow
            }
            
          ////////////////////////////////////////////////
          } else{// element doesn't have "other" option
            for(var cbt2 = 0; cbt2 < curitem.ansNum.length; cbt2++){
              switch(cbt2){
                case 0:
                  // do nothing, we have our first element!
                  break;
                default:
                  // add separator for list
                  temps = temps.concat(separator_list);
              }
              if(parseBool(settings.useIndexes)){// use indexes, with NO "other"
                temps = temps.concat(curitem.ansNum[cbt2]);
              } else{// don't use indexes, with NO "other"
                temps = temps.concat("'",formatString(curitem.ansString[cbt2], settings, 456),"'");
              }
            }// end of for loop (of selected items)
            
          }
         
         break;
       case "MULTIPLE_CHOICE":
         //code
         // getChoices() >>>>>>> Choice[]
         // hasOtherOption() >>>>>>> Boolean
         //Logger.log("############ MULTIPLE_CHOICE ############");
          if(parseBool(curitem.hasOther)){// element has possibility for "other"
            var tempstringmc = "";
            
            if(parseBool(settings.useIndexes)){// use indexes WITH "other" option
              //
              if(curitem.ansNum === -1){// response was "other"
                tempstringmc = formatString(curitem.ansString, settings);
              }
              temps = temps.concat(curitem.ansNum);
            }else{// DO NOT use indexes WITH "other" option
              //
              if(curitem.ansNum === -1){// response was "other"
                tempstringmc = formatString(curitem.ansString, settings);
                temps = temps.concat("OTHER");
              } else{// response was NOT "other"
                temps = temps.concat('"',formatString(curitem.ansString, settings, 123),'"');
              }
            }
            if(tempstringmc.length === 0){
              temps = temps.concat(separator);
            }else{
              temps = temps.concat(separator, '"',tempstringmc, '"');// add tempstring to datarow
            }
            
          ////////////////////////////////////////////////////
          } else{// element doesn't have "other" option
            if(parseBool(settings.useIndexes)){// use indexes with NO "other" option
              temps = temps.concat(curitem.ansNum);
            } else{// DO NOT use indexes with NO "other" option
              temps = temps.concat('"',formatString(curitem.ansString, settings, 123),'"');
            }
          }
         
         break;
       case "LIST":
         //code
         //Logger.log("############ LIST ############");
          if(parseBool(settings.useIndexes)){
            temps = temps.concat(curitem.ansNum);
          } else{
            temps = temps.concat('"',formatString(curitem.ansString, settings, 123),'"');
          }

         break;
       case "CHECKBOX_GRID":
         //code//
         //Logger.log("############ CHECKBOX_GRID ############"); 
         // Returns String[][] !!!!!!!!
          //temps = temps.concat('"');// OPTIONAL
          //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// NEED TO RECHECK ALL UNDER HERE!!!!
          /*
          Logger.log("CBG sheetid: "+sheet_id);
          if(sheet_id === 0){// first sheet only; adding new rows to titlerow NOW HERE
            Logger.log("sheet 0 CHECKBOX_GRID");
            Logger.log(curitem.rows.length);
            Logger.log(curitem.title);
                  //var rowleng3 = curitem.rows.length;
                  var titrowstr3 = curitem.title;
                  var titrowcheckcbgrid = false;
                  if(titrowstr3 === null || titrowstr3 === undefined || titrowstr3.length === 0){titrowstr3 = "NO_TITLE"; titrowcheckcbgrid = true;}
            for(var titlerowstr3_row = 0; titlerowstr3_row < curitem.rows.length; titlerowstr3_row++){
                  var titrowstr3_1 = titrowstr3.concat("[ROW_"+titlerowstr3_row+1+"]");
                  if(titrowcheckcbgrid){
                    titlerow = titlerow.concat(separator,formatString(titrowstr3_1,settings,123));
                  }else{
                    titlerow = titlerow.concat(separator,'"',formatString(titrowstr3_1,settings,123), '"');
                  }
          }
                }
          */
          if(curitem.ansNum.length == 0){
            // no answers, setting "blank" fields per row 
            for(var cbgt12 = 1;cbgt12 < curitem.rows.length;cbgt12++){// starts at 1, because one item doesn't need separator in front
              //
              temps = temps.concat(separator);
            }
            
          } else {
          for(var cbgt1 = 0; cbgt1 < curitem.ansNum.length; cbgt1++){// looping rows
            //
            switch(cbgt1){
              case 0:
                // do nothing
                break;
              default:
                //
                temps = temps.concat(separator);// need to add new separator here, since "normal one" doesn't happen here
                // WAS HERE
            }
            //temps = temps.concat('"');// OPTIONAL
            if(curitem.ansNum[cbgt1] === null){// row is null
              continue;
            }
            temps = temps.concat('"');// OPTIONAL
            for(var cbgt2 = 0; cbgt2 < curitem.ansNum[cbgt1].length; cbgt2++){// row was NOT null; looping selected (on row)
              switch(cbgt2){
                case 0:
                  // do nothing
                  break;
                default:
                  temps = temps.concat(separator_list);// adding new list separator
              }
              if(parseBool(settings.useIndexes)){
                //
                temps = temps.concat(curitem.ansNum[cbgt1][cbgt2]);
              } else{
                //
                temps = temps.concat("'",formatString(curitem.ansString[cbgt1][cbgt2], settings, 456),"'");
              }
            }
            temps = temps.concat('"');// OPTIONAL
          }
      }
          //temps = temps.concat('"');// OPTIONAL
         break;
       case "GRID":
         //code
         //Logger.log("############ GRID ############");
          // setting BOTH titlerow and datarow....
          //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// NEED TO RECHECK ALL UNDER HERE!!!!
          // NOW HERE
          /*
           Logger.log("G sheetid: "+sheet_id);
          if(sheet_id === 0){// first sheet only; adding new row to titlerow
            Logger.log("sheet 0 GRID");
            Logger.log(curitem.rows.length);
            Logger.log(curitem.title);
                  var titrowstr4 = curitem.title;
                  var titrowcheckgrid = false;
                  if(titrowstr4 === null || titrowstr4 === undefined || titrowstr4.length === 0){titrowstr4 = "NO_TITLE";titrowcheckgrid = true;}
            
                  for(var titlerowstr4_row = 0; titlerowstr4_row < curitem.rows.length; titlerowstr4_row++){
                  var titrowstr4_1 = titrowstr4.concat("[ROW_"+titlerowstr4_row+1+"]");
                  if(titrowcheckcbgrid){
                    titlerow = titlerow.concat(separator,formatString(titrowstr4_1,settings,123));
                  }else{
                    titlerow = titlerow.concat(separator,'"',formatString(titrowstr4_1,settings,123), '"');
                  }
                  }
                }
          */
         if(curitem.ansNum.length == 0){
            // no answers, setting "blank" fields per row 
            for(var gt12 = 1;gt12 < curitem.rows.length;gt12++){// starts at 1, because one item doesn't need separator in front
              //
              temps = temps.concat(separator);
            }
            
         } else{
          for(var gt1 = 0; gt1 < curitem.ansNum.length; gt1++){
            //
            switch(gt1){
              case 0:
                // do nothing
                break;
              default:
                //
                temps = temps.concat(separator);// need to add new separator here, since "normal one" doesn't happen here
                // WAS HERE
            }
            
            if(curitem.ansNum[gt1] === null){
              continue;
            }
            if(parseBool(settings.useIndexes)){
              //
              temps = temps.concat(curitem.ansNum[gt1]);
            } else{
              //
              temps = temps.concat('"',formatString(curitem.ansString[gt1], settings, 123),'"');
            }
          }
         }
          
         break;
       case "DATE":
         //code
         //Logger.log("############ DATE ############");
         // includesYear() >>>>> Boolean
          temps = temps.concat('"',formatString(curitem.ansString, settings, 123),'"');
        
         break;
       case "DATETIME":
         //code
         //Logger.log("############ DATETIME ############");
         // includesYear() >>>>> Boolean
          temps = temps.concat('"',formatString(curitem.ansString, settings, 123),'"');
        
         break;
       case "DURATION":
         //code
         //Logger.log("############ DURATION ############");
          temps = temps.concat('"',formatString(curitem.ansString, settings, 123),'"');
        
         break;
       case "IMAGE":
         //code ##########################
         //Logger.log("############ IMAGE ############");
        
         break;
       case "VIDEO":
         //code ##########################
         //Logger.log("############ VIDEO ############");
        
         break;
       case "PAGE_BREAK":
         //Logger.log("############ PAGE_BREAK ############");
         //code ###############################
        
         break;
       case "PARAGRAPH_TEXT":
         //Logger.log("############ PARAGRAPH_TEXT ############");
          temps = temps.concat('"',formatString(curitem.ansString, settings),'"');
        
         break;
       case "SCALE":
         //Logger.log("############ SCALE ############");
          if(parseBool(settings.useIndexes)){
            temps = temps.concat(curitem.ansNum);
          } else{
            temps = temps.concat('"',formatString(curitem.ansString, settings, 123),'"');
          }
        
         break;
       case "SECTION_HEADER":
         //Logger.log("############ SECTION_HEADER ############");
         //code ######################
        
         break;
       case "TEXT":
         //code
         //Logger.log("############ TEXT ############");
          temps = temps.concat('"',formatString(curitem.ansString, settings),'"');
        
         break;
       case "TIME":
         //code
         //Logger.log("############ TIME ############");
          temps = temps.concat('"',formatString(curitem.ansString, settings, 123),'"');
        
         break;
       default:
         // Default. This means that the question type was something special, or invalid....
         //Logger.log("############ INVALID!!! DEFAULT!!! ############");
          console.warn("convertJSONToCSV(): Question type unknown or invalid! Type was '"+curitem.type+"'");
    }// end of switch-structure for form itemtypes
      
      
    }// end of ONE survey response content loop
    temps = temps.concat(newline);
    fins = fins.concat(temps);
    sheet_id++;
  }// end of ALL survey response loop
  fins = fins.slice(0, -Math.abs(newline.length));// removing last newline from file string
  if(parseBool(settings.useTitleRow)){
    titlerow = titlerow.concat(newline,fins);
    return titlerow;
  }else{
    return fins;
  }
}

/* Get current user's settings object */
function getSettings(mode){
  // get settings of the export
  var settings = PropertiesService.getUserProperties().getProperties();
  if(mode != undefined && mode === 1){
    if(!settings.running){// if operation is currently underway
      settings.running = false;
    }
    return settings.running;
  }
  if(!settings.separator){// if CSV values are, for example, separeted by ; or ,
    settings.separator = 0;
  }
  if(!settings.escapeCode){// if things like " < > & are changed to html number representation, or removed
    settings.escapeCode = false;
    // THIS OVERRIDES settings.useDoubleQuotes //
  }
  if(!settings.useDoubleQuotes){// if quotes (") in strings should be turned into double (""), to make strings combatible with CSV format
    settings.useDoubleQuotes = true
    // this will never be disabled. This acts as failsafe to keep CSV format valid
  }
  if(!settings.useIndexes){// to use or not to use indexes (integers) instead of string answers in multichoice etc.
    settings.useIndexes = true;
  }
  if(!settings.useTitleRow){// if the first row of the CSV file should contain title row
    settings.useTitleRow = true;
  }
  if(!settings.useEmail){// if should give form response email
    settings.useEmail = false;
  }
  if(!settings.useTimeStamp){// if should give form response timestamp
    settings.useTimeStamp = true;
  }
  if(!settings.useID){// if should give form response id
    settings.useID = false;
  }
  if(!settings.newline){// which should be used as newline: \r\n or just \n
    settings.newline = 0;
  }
  return settings;
}

/* Set current user's settings object */
function setSettings(settings, mode, status){
  // set "settings" object as current settings
  if(mode != undefined && mode === -1){
    Logger.log("Resetting settings to defaults...");
    // need to reset settings to default...
    PropertiesService.getUserProperties().setProperty("separator", 0)
    PropertiesService.getUserProperties().setProperty("escapeCode", false)
    PropertiesService.getUserProperties().setProperty("useDoubleQuotes", true)
    PropertiesService.getUserProperties().setProperty("useIndexes", true)
    PropertiesService.getUserProperties().setProperty("useTitleRow", true)
    PropertiesService.getUserProperties().setProperty("useEmail", false)
    PropertiesService.getUserProperties().setProperty("useTimeStamp", true)
    PropertiesService.getUserProperties().setProperty("useID", false)
    PropertiesService.getUserProperties().setProperty("newline", 0)
    return true;
  }
  if(mode != undefined && mode === -2){
    Logger.log("Toggling 'running' status...");
    // setting ONLY running-status
    if(status === undefined){status = false;}
    var status_parsed = parseBool(status);
    PropertiesService.getUserProperties().setProperty("running", status_parsed);
    return true;
  }
  Logger.log("Changing settings based on user input...");
  var separator = settings.separator;
  var escapeCode = parseBool(settings.escapeCode, 0);
  var useDoubleQuotes = parseBool(settings.useDoubleQuotes, 1);
  var useIndexes = parseBool(settings.useIndexes, 1);
  var useTitleRow = parseBool(settings.useTitleRow, 1);
  var useEmail = parseBool(settings.useEmail, 0);
  var useTimeStamp = parseBool(settings.useTimeStamp, 1);
  var useID = parseBool(settings.useID, 0);
  var newline = settings.newline;
  
  separator = parseInt(separator);
  if(isNaN(separator)){
    separator = 0;
  }
  newline = parseInt(newline);
  if(isNaN(newline)){
    newline = 0;
  }
  
  PropertiesService.getUserProperties().setProperty("separator",separator);
  PropertiesService.getUserProperties().setProperty("escapeCode", escapeCode);
  PropertiesService.getUserProperties().setProperty("useDoubleQuotes", useDoubleQuotes);
  PropertiesService.getUserProperties().setProperty("useIndexes", useIndexes);
  PropertiesService.getUserProperties().setProperty("useTitleRow", useTitleRow);
  PropertiesService.getUserProperties().setProperty("useEmail", useEmail);
  PropertiesService.getUserProperties().setProperty("useTimeStamp", useTimeStamp);
  PropertiesService.getUserProperties().setProperty("useID", useID);
  PropertiesService.getUserProperties().setProperty("newline", newline);
  return true;

}

// returns true or false based on input; defaults to 'false' as failsafe
function parseBool(thisval, mode){
  switch(mode){
    case 0:
      mode = false;
      break;
    case 1:
      mode = true;
      break;
    default:
      mode = false;
  }
  if(thisval === undefined){
    //Logger.log("parseBool thisval undefined! Defaulting...");
    return mode;
  }
  var returnBool = thisval === 'true' ? true : 
         thisval === 'false' ? false : 
         thisval;
  if(returnBool != true && returnBool != false){
    //Logger.log("parseBool value not boolean! Defaulting...");
    returnBool = mode;
  }
  return returnBool;
}

/**
 * Adds a custom menu to the active form to show the add-on sidebar.
 *
 * @param {object} e The event parameter for a simple onOpen trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode.
 */
function onOpen(e) {// Needed to be used with AddOn (creates menu)
  // need to check OAuthMode HERE !!!!!!!!!!!!!!1
  /*
  FormApp.getUi()
      .createAddonMenu()
      .addItem('Export', 'exportRun')
      .addItem('Settings', 'showSettings')
      .addItem('About', 'showAbout')
  .addItem('RESET', 'resettest')
      .addToUi();
  */
  //var authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  //authInfo.getAuthorizationStatus() == ScriptApp.AuthorizationStatus.REQUIRED
  Logger.log(e.authMode);
  if(e && e.authMode == ScriptApp.AuthMode.NONE){
    // Get authorization
    Logger.log("# Authorization required!");
    FormApp.getUi()
  .createAddonMenu()
  .addItem('Authorize', 'authorizeAddon')
  .addToUi();
  } else {
    Logger.log("# Authorization was not NONE!");
    FormApp.getUi()
  .createAddonMenu()
  .addItem('Control Panel', 'showControlPanel')
  .addItem('About', 'showAbout')
  .addToUi();
  }
  
  
}

function authorizeAddon(){
  //
  var authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  //Logger.log(authInfo.getAuthorizationStatus());
  if(authInfo.getAuthorizationStatus() == ScriptApp.AuthorizationStatus.REQUIRED){
    //Logger.log("WAS NOT AUTHORIZED");
  } else{
    //Logger.log("WAS NOT REQUIRED");
    FormApp.getUi()
  .createAddonMenu()
  .addItem('Control Panel', 'showControlPanel')
  .addItem('About', 'showAbout')
  .addToUi();
  }
  
  //FormApp.getUi().alert(prompt)
  
}
/*
// TESTING PURPOSES; RESETS ALL SETTINGS
function resettest(){
  setSettings({},-1);
  setSettings({},-2,false);
}
*/
function resetSettings(){
  var running = parseBool(getSettings(1));
  if(running){return false;}
  setSettings({},-1);
  return true;
}
/**
 * Adds a custom menu to the active form to show the add-on sidebar.
 *
 * @param {object} e The event parameter for a simple onOpen trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode.
 */
function onInstall(e) {
  onOpen(e);
}

function controlpanelfail(){
  console.log("Failure happened in control panel!");
}

/* Test function that runs custom functions (DEV USE ONLY) */
function exportRun(){
  Logger.log("Starting export....");
  var status = getSettings(1);
  var rescounter = FormApp.getActiveForm().getResponses().length;
  if(parseBool(status)){
    Logger.log("Currently running! Unable to start...");
    //var response = FormApp.getUi().alert("Please wait for other operations to finish before trying to export!")
    var htmlOutput = HtmlService
    .createHtmlOutput('<p>Please wait for other operations to finish before trying to export!</p>')
    .setWidth(250)
    .setHeight(100);
    FormApp.getUi().showModalDialog(htmlOutput, 'Unable to start export!');
    return false;
  } else if(rescounter == 0){
    //test if there are any answers
    var htmlOutput = HtmlService
    .createHtmlOutput('<p>No responses in the current form!</p>')
    .setWidth(250)
    .setHeight(100);
    FormApp.getUi().showModalDialog(htmlOutput, 'Unable to start export!');
    return false;
  }
  // we can export...
  setSettings({},-2,true);
  //showTestNotification();
  /*,
    "https://www.googleapis.com/auth/script.container.ui",
    "https://www.googleapis.com/auth/documents.currentonly",
    "https://www.googleapis.com/auth/script.scriptapp"*/
  var csvstring = getSurveyString();
  Logger.log("Syrvey string parsed!");
  Logger.log("Variable type: '"+typeof(csvstring)+"'")
  Logger.log("String length: "+csvstring.length+" characters...")
  Logger.log("Creating file and making download link....");
  downloadFile(csvstring);
  
  setSettings({},-2,false);
  
  return true;
}


/**
 * Opens a sidebar in the form containing the add-on's user interface for
 * configuring the notifications this add-on will produce.
 */
function showControlPanel() {
  
  // Needed to show AddOn settings sidebar
  var settings = getSettings();
  setSettings(settings);
  //
    var ui = HtmlService.createHtmlOutputFromFile('settings')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setTitle('Custom CSV Export');
    FormApp.getUi().showSidebar(ui);
  
}

/**
 * Opens a purely-informational dialog in the form explaining details about
 * this add-on.
 */
function showAbout() {// Needed to show AddOn About window (with more info about AddOn itself)
  var ui = HtmlService.createHtmlOutputFromFile('about');
  FormApp.getUi().showModalDialog(ui, 'About Custom CSV Export');
}

function downloadFile( to_file_data ){// Called after string is complete, to save file to user's Drive as csv
  to_file_data = typeof to_file_data !== 'undefined' ? to_file_data : 'this content is for test purposes and acts as placeholder IF SEEN PLEASE NOTIFY DEVELOPER';
  var datebase = new Date();
  var datestring = datebase.getUTCDate()+"-"+(datebase.getUTCMonth()+1)+"-"+datebase.getUTCFullYear()+"_"+datebase.getUTCHours()+"-"+datebase.getUTCMinutes()+"-"+datebase.getUTCSeconds()+"-UTC";
  var custfilnam = "custom_csv_export_"+datestring;
  
  //var file = DriveApp.createFile(custfilnam, to_file_data, MimeType.CSV);
  // Checking if folder exists in user's Drive root. If not, creating it...
  var folders = DriveApp.getRootFolder().getFolders();
  var check = false;
  var folderz = null;
  while (folders.hasNext()) {
    var folder = folders.next();
    if(folder.getName() === "Custom CSV Export"){
      check = true;
      folderz = folder;
      break;
    }
  }
  if(!check){
    folderz = DriveApp.getRootFolder().createFolder("Custom CSV Export");
  }
  var filez = folderz.getFiles();
  // so whenever there happens to be 2 files with same name... adding incrementing counter like "(1)" at the end of name
  while(filez.hasNext()){
    filex = filez.next();
    if(filex.getName() === custfilnam){
      var filnit = 1;
      while(true){
        if(filex.getName() === custfilnam.concat("(",filnit,")")){
          //
          filnit++;
          continue;
        } else{
          custfilnam = custfilnam.concat("(",filnit,")");
          break;
        }
      }
      break;
    }
  }
  var myblob = Utilities.newBlob(to_file_data, 'text/csv', custfilnam)
  var file = folderz.createFile(myblob);
  
  var fileID = file.getId();
  var fileName = file.getName();
  //var downurl = file.getDownloadUrl();
  var downurl = "https://drive.google.com/uc?export=download&id="+fileID
  //var AccessToken=((Google.Apis.Auth.OAuth2.UserCredential).service1.HttpClientInitializer).Token.AccessToken;
  //HttpWebRequest request = WebRequest.Create(downurl) as HttpWebRequest;
  //request.Method = "GET";
  //request.Headers.Add("Authorization", "Bearer " + AccessToken);
  //WebResponse response = request.GetResponse();
  var downlui = HtmlService.createHtmlOutput('<html><head><base target="_top"><link rel="stylesheet" href="https://ssl.gstatic.com/docs/script/css/add-ons1.css"></head><body><p>File has been exported to your Google Drive root folder named "Custom CSV Export".</p><p> View file there, or download the file by clicking the link below. </p> <p><a href="'+downurl+'"><b>Download file "'+fileName+'"</b></a></p></body></html>');
  FormApp.getUi().showModalDialog(downlui, "Custom CSV Export - File download");
}