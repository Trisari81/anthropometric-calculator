SOURCE_SPREADSHEET_ID = "14nyjileJ59FB0fWfbZmF4uo0evjvRufNWTBv2ZID4g0";

M_HEIGHT_RANGE_NAME = "рост М!A24:H42";
M_WEIGHT_RANGE_NAME = "Масса М!A24:H42";
M_CHEST_RANGE_NAME = "Грудь М!A24:H42";

F_HEIGHT_RANGE_NAME = "рост Ж!A24:H42";
F_WEIGHT_RANGE_NAME = "Масса Ж!A24:H42";
F_CHEST_RANGE_NAME = "Грудь Ж!A24:H42";

ESTIMATION_BY_SUM = "Оценка!A2:B16";
ESTIMATION_BY_DIFFERENCE = "Оценка!A19:B26";

function doGet(e) {

    var sex = e.parameter.sex;
    var age = parseFloat(e.parameter.age);
    var height = parseInt(e.parameter.height);
    var weight = parseInt(e.parameter.weight);
    var chest = parseInt(e.parameter.chest);

    var centiles = calculateCentiles(sex, age, height, weight, chest);
    var result = combineEstimations(centiles);

    var response = {centiles: centiles, result: result};

    HtmlService.createHtmlOutput()
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function combineEstimations(centiles) {
    var result;
    var estimationBySum = calculateEstimationByCentileSum(centiles);
    if (estimationBySum.centileSum > 6) {
        var estimationByCentilesDifference = calculateEstimationByCentilesDifference(centiles);
    }
    if (estimationByCentilesDifference) {
        result = {
            estimationBySum: estimationBySum.estimation,
            estimationByCentilesDifference: estimationByCentilesDifference
        };
    } else {
        var message = "ОШИБКА в расчете разницы центилей";
        result = {
            estimationBySum: estimationBySum.estimation,
            estimationByCentilesDifference: message
        };
        Logger.log(message);
        console.log(message);

    }
    return result;
}

function calculateEstimationByCentilesDifference(centiles) {

    var estimationTable = getTable(ESTIMATION_BY_DIFFERENCE);

    var detailedEstimation = {
        height: undefined,
        weight: undefined,
        chest: undefined
    };

    var estHeightWeight = estimationForTwoCentiles(
        centiles.height,
        centiles.weight,
        estimationTable,
        "weight",
        detailedEstimation
    );

    var estHeightChest = estimationForTwoCentiles(
        centiles.height,
        centiles.chest,
        estimationTable,
        "chest",
        detailedEstimation
    );

    if (!detailedEstimation.height && !detailedEstimation.weight && !detailedEstimation.chest) {
        detailedEstimation = undefined
    }

    var estimation = chooseEstimationFromAnswers(estHeightWeight, estHeightChest);

    return {estimation: estimation, details: detailedEstimation};

}

function chooseEstimationFromAnswers(estHeightWeight, estHeightChest) {
    var estimations = [
        estHeightWeight.estimation,
        estHeightChest.estimation
    ];

    var estimation = estimations.sort(function (a, b) {
        // ASC  -> a.length - b.length
        // DESC -> b.length - a.length
        return b.length - a.length;
    })[0];
    return estimation;
}

function collectAdditionalEstimation(estHeightWeight, estHeightChest) {
    var addEstArray = [];
    addEstArray.push.apply(addEstArray, estHeightWeight.additionEstimation);
    addEstArray.push.apply(addEstArray, estHeightChest.additionEstimation);

    addEstArray = addEstArray.reduce(function (a, b) {
        if (a.indexOf(b) < 0) a.push(b);
        return a;
    }, []);
    return addEstArray;
}

function estimationForTwoCentiles(height, second, estimationTable, secondName, detailedEstimation) {
    var diff = height - second;

    function estimationByDifference() {
        for (var row = 0; row < estimationTable.length; row++) {

            var estimation;
            if (Math.abs(diff) == parseInt(estimationTable[row][0])) {
                estimation = estimationTable[row][1]
            }
        }
        return estimation;
    }

    function estimateDetailedEstimation() {

        if (height > 6) {
            detailedEstimation.height = "избыток";
        }

        if (height < 3) {
            detailedEstimation.height = "недостаток";
        }

        if (Math.abs(diff) >= 3) {
            if (diff > 0) {
                if (height > 6) {
                    detailedEstimation.height = "избыток";
                }
                detailedEstimation[secondName] = "недостаток";
            } else {
                if (height < 4) {
                    detailedEstimation.height = "недостаток";
                }
                detailedEstimation[secondName] = "избыток";
            }
        }
        return detailedEstimation;
    }

    return {estimation: estimationByDifference(), additionEstimation: estimateDetailedEstimation()};
}

function calculateEstimationByCentileSum(centiles) {
    Logger.log("Start calculation Centile Sum for centiles %s", centiles);
    console.log("Start calculation Centile Sum for centiles %s", centiles);

    var centileSum = centiles.height + centiles.weight + centiles.chest;

    Logger.log("Centile Sum is %s", centileSum);
    console.log("Centile Sum is %s", centileSum);

    var estimationTable = getTable(ESTIMATION_BY_SUM);

    if (centileSum < 3) {
        Logger.log("Centile can't be less than 3");
        console.log("Centile can't be less than 3");
    } else if (centileSum > 17) {
        //specialCase
        centileSum = 17;
    }

    for (var row = 0; row < estimationTable.length; row++) {
        if (centileSum == parseInt(estimationTable[row][0])) {
            return {estimation: estimationTable[row][1], centileSum: centileSum}
        }
    }

    return {estimation: "Ошибка", centileSum: centileSum};
}

function calculateCentiles(sex, age, height, weight, chest) {
    Logger.log("Start calculation Centiles for sex %s, age %s, height %s, wieght %s, chest %s", sex, age, height, weight, chest);
    console.log("Start calculation Centiles for sex %s, age %s, height %s, wieght %s, chest %s", sex, age, height, weight, chest);
    var heightTable;
    var weightTable;
    var chestTable;

    if (sex === "m") {
        heightTable = getTable(M_HEIGHT_RANGE_NAME);
        heightTable = changeDelimiterAndParseTable(heightTable);

        weightTable = getTable(M_WEIGHT_RANGE_NAME);
        weightTable = changeDelimiterAndParseTable(weightTable);

        chestTable = getTable(M_CHEST_RANGE_NAME);
        chestTable = changeDelimiterAndParseTable(chestTable);
    } else {
        heightTable = getTable(F_HEIGHT_RANGE_NAME);
        heightTable = changeDelimiterAndParseTable(heightTable);

        weightTable = getTable(F_WEIGHT_RANGE_NAME);
        weightTable = changeDelimiterAndParseTable(weightTable);

        chestTable = getTable(F_CHEST_RANGE_NAME);
        chestTable = changeDelimiterAndParseTable(chestTable);
    }

    var heightCentile = getCentile(age, height, heightTable, "height");
    var weightCentile = getCentile(age, weight, weightTable, "weight");
    var chestCentile = getCentile(age, chest, chestTable, "chest");

    return {
        height: heightCentile,
        weight: weightCentile,
        chest: chestCentile
    };
}


function getCentile(age, value, table, tableName) {
    Logger.log("getCentile for age %s, tableName %s", age, tableName);
    console.log("getCentile for age %s, tableName %s", age, tableName);
    if (validateTable(table)) {
        var centile;
        var row = getRowByAge(age, table);
        if (value < row[0]) {
            centile = 1;
        }
        if (value >= row[row.length - 1]) {
            centile = 8;
        }
        if (centile) {
            return centile
        }
        for (var i = 0; i < row.length - 1; i++) {
            if (row[i] <= value && value < row[i + 1]) {
                return i + 1;
            }
        }
    }
}

function validateTable(table) {
    Logger.log("validate table");
    console.log("validate table");
    if (!8 == table[0].length) {
        Logger.log("ERROR: table contains not 8 columns");
        console.log("ERROR: table contains not 8 columns");
        return false;
    }
    return true;
}

function getRowByAge(age, table) {
    for (var row = 0; row < table.length; row++) {
        if (age == table[row][0]) {
            return table[row]
        }
    }
}

function changeDelimiterAndParseTable(table) {
    Logger.log("changeDelimiterAndParseTable");
    console.log("changeDelimiterAndParseTable");
    var length = table.length;
    var width = table[0].length;
    for (var row = 0; row < length; row++) {
        for (var col = 0; col < width; col++) {
            var stringValue = table[row][col];
            stringValue = stringValue.replace(",", ".");
            table[row][col] = parseFloat(stringValue);
            if (!table[row][col]) {
                console.log("ERROR: Cant parse value %s", stringValue);
                Logger.log("ERROR: Cant parse value %s", stringValue);
            }
        }
    }
    return table;
}

function getTable(rangeName) {
    Logger.log("getTable %s", rangeName);
    console.log("getTable %s", rangeName);
    var values = Sheets.Spreadsheets.Values.get(SOURCE_SPREADSHEET_ID, rangeName).values;
    if (!values) {
        Logger.log("ERROR: No data found.");
    }
    return values;
}

function printTable(rangeName) {

    var values = getTable(rangeName);
    if (!values) {
        Logger.log("ERROR: No data found.");
    } else {
        Logger.log("values:");
        var length = values.length;
        var width = values[0].length;
        for (var row = 0; row < length; row++) {
            for (var col = 0; col < width; col++) {
                Logger.log(values[row][col]);
            }
        }
    }
}

function testFinal() {

    Logger.log("TEST 1");
    var centiles = calculateCentiles("m", 7, 119, 19, 56);
    var result = combineEstimations(centiles);
    Logger.log(result);
    Logger.log("------------------");

    Logger.log("TEST 2");
    centiles = calculateCentiles("m", 7, 132, 27.7, 62);
    result = combineEstimations(centiles);
    Logger.log(result);
    Logger.log("------------------");

    Logger.log("TEST 3");
    centiles = calculateCentiles("f", 8, 124.4, 25.5, 61);
    result = combineEstimations(centiles);
    Logger.log(result);
    Logger.log("------------------");

    Logger.log("TEST 4");
    centiles = calculateCentiles("m", 8, 133, 33.8, 69);
    result = combineEstimations(centiles);
    Logger.log(result);
    Logger.log("------------------");

    Logger.log("TEST 5");
    centiles = calculateCentiles("m", 9, 145, 35.1, 64);
    result = combineEstimations(centiles);
    Logger.log(result);
    Logger.log("------------------");

    Logger.log("TEST 6");
    centiles = calculateCentiles("f", 10, 124, 24.5, 62);
    result = combineEstimations(centiles);
    Logger.log(result);
    Logger.log("------------------");

    Logger.log("TEST 7");
    var centiles = calculateCentiles("f", 9, 124.4, 24, 59);
    var result = combineEstimations(centiles);
    Logger.log(result)
    Logger.log("------------------");

    Logger.log("TEST 8");
    var centiles = calculateCentiles("f", 14, 170, 49, 74);
    var result = combineEstimations(centiles);
    Logger.log(result)
    Logger.log("------------------");

    Logger.log("TEST 9");
    var centiles = calculateCentiles("f", 8, 135, 23.9, 58);
    var result = combineEstimations(centiles);
    Logger.log(result)
    Logger.log("------------------");

    Logger.log("TEST 10");
    var centiles = calculateCentiles("m", 11, 135, 27.1, 61);
    var result = combineEstimations(centiles);
    Logger.log(result)
    Logger.log("------------------");

    Logger.log("TEST 11");
    var centiles = calculateCentiles("m", 10, 141, 45.4, 72);
    var result = combineEstimations(centiles);
    Logger.log(result)
    Logger.log("------------------");

    Logger.log("TEST 12");
    var centiles = calculateCentiles("m", 10, 151, 36.9, 68);
    var result = combineEstimations(centiles);
    Logger.log(result)
    Logger.log("------------------");

    Logger.log("TEST 13");
    var centiles = calculateCentiles("m", 7, 132, 20, 62);
    var result = combineEstimations(centiles);
    Logger.log(result)
    Logger.log("------------------");
}

function testPrintTable() {
    printTable(M_HEIGHT_RANGE_NAME);
}

function testPrintRowByAge() {
    var table = getTable(M_HEIGHT_RANGE_NAME);
    table = changeDelimiterAndParseTable(table);
    var row = getRowByAge(6, table);
    Logger.log(row)
}

function testCentileM_HEIGHT_RANGE_NAME() {
    var table = getTable(M_HEIGHT_RANGE_NAME);
    table = changeDelimiterAndParseTable(table);

    Logger.log(getCentile(6, 103.5, table) == 1);
    Logger.log(getCentile(6, 123.9, table) == 8);
    Logger.log(getCentile(6, 106.2, table) == 2);
    Logger.log(getCentile(6, 119, table) == 6);
}

function testCalculateCentileSum() {
    var centiles = calculateCentiles("m", 6, 108, 23, 55);
    var centilesSum = centiles.height + centiles.weight + centiles.chest;
    Logger.log(centilesSum);
    Logger.log(centilesSum == 12);
    //108 - 3
    //23 - 6
    //55 - 3
    //12
}

function testCalculateEstimationByCentileSum() {
    var centiles = calculateCentiles("m", 6, 108, 23, 55);
    var estimationByCentileSum = calculateEstimationByCentileSum(centiles);
    Logger.log(estimationByCentileSum);
    Logger.log(estimationByCentileSum == "мезосоматический");
}

function testCalculateEstimationByCentilesDifference() {
    //test1
    var centiles = {
        "height": 7,
        "weight": 3,
        "chest": 3
    };
    Logger.log("centiles is %s", centiles);
    var estimation = calculateEstimationByCentilesDifference(centiles);
    Logger.log("estimation is %s", estimation);

    //test2
    centiles = {
        "height": 3,
        "weight": 7,
        "chest": 3
    };
    Logger.log("centiles is %s", centiles);
    var estimation = calculateEstimationByCentilesDifference(centiles);
    Logger.log("estimation is %s", estimation);


    //test3
    centiles = {
        "height": 3,
        "weight": 3,
        "chest": 3
    };
    Logger.log("centiles is %s", centiles);
    var estimation = calculateEstimationByCentilesDifference(centiles);
    Logger.log("estimation is %s", estimation);
}
