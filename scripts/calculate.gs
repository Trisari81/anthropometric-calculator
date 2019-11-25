SOURCE_SPREADSHEET_ID = "1weSlBPjJRylpbd8HuDwo2lPa1k2aA2CGYesh_7m7ZPs";

M_HEIGHT_RANGE_NAME = "рост М!A24:I42";
M_WEIGHT_RANGE_NAME = "Масса М!A24:I42";
M_CHEST_RANGE_NAME = "Грудь М!A24:I42";

F_HEIGHT_RANGE_NAME = "рост Ж!A24:I42";
F_WEIGHT_RANGE_NAME = "Масса Ж!A24:I42";
F_CHEST_RANGE_NAME = "Грудь Ж!A24:I42";

ESTIMATION_BY_SUM = "Оценка!A2:B16";
ESTIMATION_BY_DIFFERENCE = "Оценка!A19:B26";

function doGet(e) {

    var sex = e.parameter.sex;
    var age = parseInt(e.parameter.age);
    var month = parseInt(e.parameter.month);
    var height = parseFloat(e.parameter.height);
    var weight = parseFloat(e.parameter.weight);
    var chest = parseFloat(e.parameter.chest);

    var centiles = calculateCentiles(sex, age, month, height, weight, chest);
    var result = combineEstimations(centiles);

    var response = {centiles: centiles, result: result};

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

    if (estHeightChest.diff > estHeightWeight.diff) {
        return estHeightChest;
    } else {
        return estHeightWeight
    }
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

    return {
        estimation: estimationByDifference(),
        additionEstimation: estimateDetailedEstimation(),
        diff: Math.abs(diff)
    };
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
        return {estimation: estimationTable[estimationTable.length - 1][1], centileSum: centileSum}
    }

    for (var row = 0; row < estimationTable.length; row++) {
        if (centileSum == parseInt(estimationTable[row][0])) {
            return {estimation: estimationTable[row][1], centileSum: centileSum}
        }
    }

    return {estimation: "Ошибка", centileSum: centileSum};
}

function calculateCentiles(sex, age, month, height, weight, chest) {
    Logger.log("Start calculation Centiles for sex %s, age %s, months %s, height %s, weight %s, chest %s", sex, age, month, height, weight, chest);
    console.log("Start calculation Centiles for sex %s, age %s, months %s, height %s, weight %s, chest %s", sex, age, month, height, weight, chest);
    var heightTable;
    var weightTable;
    var chestTable;

    if (sex === "m") {
        heightTable = getTable(M_HEIGHT_RANGE_NAME);
        heightTable = changeDelimiterAndParseTable(heightTable);
        heightTable = reformatCentileTable(heightTable);

        weightTable = getTable(M_WEIGHT_RANGE_NAME);
        weightTable = changeDelimiterAndParseTable(weightTable);
        weightTable = reformatCentileTable(weightTable);

        chestTable = getTable(M_CHEST_RANGE_NAME);
        chestTable = changeDelimiterAndParseTable(chestTable);
        chestTable = reformatCentileTable(chestTable);
    } else {
        heightTable = getTable(F_HEIGHT_RANGE_NAME);
        heightTable = changeDelimiterAndParseTable(heightTable);
        heightTable = reformatCentileTable(heightTable);

        weightTable = getTable(F_WEIGHT_RANGE_NAME);
        weightTable = changeDelimiterAndParseTable(weightTable);
        weightTable = reformatCentileTable(weightTable);

        chestTable = getTable(F_CHEST_RANGE_NAME);
        chestTable = changeDelimiterAndParseTable(chestTable);
        chestTable = reformatCentileTable(chestTable);
    }

    var heightCentile = getCentile(age, month, height, heightTable, "height");
    var weightCentile = getCentile(age, month, weight, weightTable, "weight");
    var chestCentile = getCentile(age, month, chest, chestTable, "chest");

    return {
        height: heightCentile,
        weight: weightCentile,
        chest: chestCentile
    };
}

function reformatCentileTable(inputTable) {
    var table = new Object();
    Logger.log("reformatTable");
    console.log("reformatTable");
    var length = inputTable.length;
    var width = inputTable[0].length;
    for (var row = 0; row < length; row++) {
        var YYMM = inputTable[row].slice(0, 2);
        table[YYMM] = inputTable[row].slice(2, 9);
    }
    return table;
}

function getCentile(age, month, value, table, tableName) {
    Logger.log("getCentile for age %s month %s, tableName %s", age, month, tableName);
    console.log("getCentile for age %s month %s, tableName %s", age, month, tableName);
    if (validateTable(table)) {
        var centile;
        var yymm = [age, month];
        var closestYearMonthInTable = findClosestYearMonthInTable(yymm, table);

        var row = table[closestYearMonthInTable[1]];
        var closestYYMM = closestYearMonthInTable[1].split(',');
        Logger.log("found closest age %s, month %s, row %s", closestYYMM[0], closestYYMM[1], row);
        console.log("found closest age %s, month %s, row %s", closestYYMM[0], closestYYMM[1], row);
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
                return i + 2;
            }
        }
    }
}

function findClosestYearMonthInTable(yearMonthInput, table) {
    var inputInMonths = yearMonthInput[0] * 12 + yearMonthInput[1];
    var firstProperty = Object.keys(table)[0];
    return Object.keys(table).reduce(function (min, key) {
        var keyArray = key.split(',');
        var currentDateInMonths = parseInt(keyArray[0] * 12) + parseInt(keyArray[1]);

        var minArray = min[1].split(',');
        var minDateInMonths = parseInt(minArray[0] * 12) + parseInt(minArray[1]);

        var diffForCurernt = Math.abs(currentDateInMonths - inputInMonths);
        var diffForMin = Math.abs(minDateInMonths - inputInMonths)
        if (diffForCurernt <= diffForMin) {
            return [diffForCurernt, key];
        } else {
            return min;
        }
    }, [1000, firstProperty]);
}

function validateTable(table) {
    Logger.log("validate table");
    console.log("validate table");
    for (var key in table) {
        var row = table[key];
        if (7 != row.length) {
            Logger.log("ERROR: table contains not 7 columns");
            console.log("ERROR: table contains not 7 columns");
            return false;
        }
    }
    return true;
}

function changeDelimiterAndParseTable(table) {
    Logger.log("changeDelimiterAndParseTable");
    console.log("changeDelimiterAndParseTable");
    var length = table.length;
    var width = table[0].length;
    for (var row = 0; row < length; row++) {
        for (var col = 2; col < width; col++) {
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

function TEST14() {

    Logger.log("TEST 14");
    var centiles = calculateCentiles("m", 18, 9, 120, 30, 60);
    var result = combineEstimations(centiles);
    Logger.log(result);
    Logger.log("------------------");
}

function TEST_MACRO() {
    Logger.log("TEST 4");
    centiles = calculateCentiles("m", 8, 0, 133, 33.8, 69);
    result = combineEstimations(centiles);
    Logger.log(result);
    Logger.log("------------------");
}

function testFinal() {

    Logger.log("TEST 1");
    var centiles = calculateCentiles("m", 7, 0, 119, 19, 56);
    var result = combineEstimations(centiles);
    Logger.log(result);
    Logger.log("------------------");

    Logger.log("TEST 2");
    centiles = calculateCentiles("m", 7, 0, 132, 27.7, 62);
    result = combineEstimations(centiles);
    Logger.log(result);
    Logger.log("------------------");

    Logger.log("TEST 3");
    centiles = calculateCentiles("f", 8, 0, 124.4, 25.5, 61);
    result = combineEstimations(centiles);
    Logger.log(result);
    Logger.log("------------------");

    Logger.log("TEST 4");
    centiles = calculateCentiles("m", 8, 0, 133, 33.8, 69);
    result = combineEstimations(centiles);
    Logger.log(result);
    Logger.log("------------------");

    Logger.log("TEST 5");
    centiles = calculateCentiles("m", 9, 0, 145, 35.1, 64);
    result = combineEstimations(centiles);
    Logger.log(result);
    Logger.log("------------------");

    Logger.log("TEST 6");
    centiles = calculateCentiles("f", 10, 0, 124, 24.5, 62);
    result = combineEstimations(centiles);
    Logger.log(result);
    Logger.log("------------------");

    Logger.log("TEST 7");
    var centiles = calculateCentiles("f", 9, 0, 124.4, 24, 59);
    var result = combineEstimations(centiles);
    Logger.log(result)
    Logger.log("------------------");

    Logger.log("TEST 8");
    var centiles = calculateCentiles("f", 14, 0, 170, 49, 74);
    var result = combineEstimations(centiles);
    Logger.log(result)
    Logger.log("------------------");

    Logger.log("TEST 9");
    var centiles = calculateCentiles("f", 8, 0, 135, 23.9, 58);
    var result = combineEstimations(centiles);
    Logger.log(result)
    Logger.log("------------------");

    Logger.log("TEST 10");
    var centiles = calculateCentiles("m", 11, 0, 135, 27.1, 61);
    var result = combineEstimations(centiles);
    Logger.log(result)
    Logger.log("------------------");

    Logger.log("TEST 11");
    var centiles = calculateCentiles("m", 10, 0, 141, 45.4, 72);
    var result = combineEstimations(centiles);
    Logger.log(result)
    Logger.log("------------------");

    Logger.log("TEST 12");
    var centiles = calculateCentiles("m", 10, 0, 151, 36.9, 68);
    var result = combineEstimations(centiles);
    Logger.log(result)
    Logger.log("------------------");

    Logger.log("TEST 13");
    var centiles = calculateCentiles("m", 7, 0, 132, 20, 62);
    var result = combineEstimations(centiles);
    Logger.log(result)
    Logger.log("------------------");
}

function testPrintTable() {
    printTable(M_HEIGHT_RANGE_NAME);
}

function testCentileM_HEIGHT_RANGE_NAME() {
    var table = getTable(M_HEIGHT_RANGE_NAME);
    table = changeDelimiterAndParseTable(table);
    table = reformatCentileTable(table);

    Logger.log(getCentile(6, 0, 103.5, table, "height") == 1);
    Logger.log(getCentile(6, 0, 123.9, table, "height") == 8);
    Logger.log(getCentile(6, 0, 106.2, table, "height") == 2);
    Logger.log(getCentile(6, 0, 119, table, "height") == 6);
}

function testCalculateCentileSum() {
    var centiles = calculateCentiles("m", 6, 0, 108, 23, 55);
    var centilesSum = centiles.height + centiles.weight + centiles.chest;
    Logger.log(centilesSum);
    Logger.log(centilesSum == 12);
    //108 - 3
    //23 - 6
    //55 - 3
    //12
}

function testCalculateEstimationByCentileSum() {
    var centiles = calculateCentiles("m", 6, 0, 108, 23, 55);
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

function testReformatTable() {
    var heightTable = getTable(M_HEIGHT_RANGE_NAME);
    heightTable = changeDelimiterAndParseTable(heightTable);
    heightTable = reformatCentileTable(heightTable);

    Logger.log(heightTable);
}

function TEST() {

    Logger.log("TEST ");
    var centiles = calculateCentiles("f", 10, 0, 124, 24.5, 62);
    var result = combineEstimations(centiles);
    Logger.log(result);
    Logger.log("------------------");
}
