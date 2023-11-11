let Tools = {
  /**
   * 获取文件扩展名
   * @param {*} fileName
   * @returns
   */
  getFileExtension: (fileName) => {
    const lastDotIndex = fileName.lastIndexOf(".");
    if (lastDotIndex === -1) {
      return ""; // 如果没有点号，返回空字符串
    }
    return fileName.slice(lastDotIndex + 1).toLowerCase();
  },

  /**
   * 解析文件内容
   * @param {*} fileContent
   * @returns
   */
  parseCSV: (fileContent) => {
    const lines = fileContent.split("\n");
    const result = [];

    for (const line of lines) {
      // 使用逗号分割每一行，并去掉每个元素两边的空格
      const elements = line.split(",").map((element) => element.trim());
      result.push(elements);
    }

    return result;
  },

  /**
   * 获取所有的CANID
   *
   * @param {*} fileContentArray
   * @returns
   */
  getAllCANId: (fileContentArray) => {
    //id列表
    const secondElements = fileContentArray.map((subarray) => subarray[5]);

    // 使用Set来获取唯一值
    const uniqueValues = [...new Set(secondElements)].slice(1, -1);

    return uniqueValues;
  },

  /**
   * 解析数据
   *
   * @param {*} canData CAN数据
   * @param {*} byteOrder 字节序
   * @param {*} bitStart 开始bit
   * @param {*} bitLength 长度
   * @param {*} precision 精度
   * @param {*} offset 偏移量
   * @param {*} isSigned 是否是无符号
   * @returns
   */
  parseCANData: (
    canData,
    byteOrder,
    bitStart,
    bitLength,
    precision,
    offset,
    isSigned
  ) => {
    if (bitLength < 1 || bitLength > 64 || bitStart < 0 || bitStart > 63) {
      return;
    }
    const canDataArray = Tools.drawMatrix(canData);
    let resultArray = [];
    let row = 0;
    let col = 0;
    if (byteOrder == 1) {
      for (let i = bitLength; i > 0; i--) {
        row = Math.floor((bitStart + i - 1) / 8);
        col = Math.abs(((bitStart + i - 1) % 8) - 7);
        resultArray.push(canDataArray[row][col]);
      }
      // let row = bitStart / 8;
      // let col = 7 - (bitStart % 8);

      // for (var k = 0; k < bitLength; k++) {
      //   if (col >= 0) {
      //     resultArray.push(canDataArray[row][col]);
      //     col--;
      //   } else {
      //     row++;
      //     col = 6;
      //     resultArray.push(canDataArray[row][7]);
      //   }
      // }
    } else {
      // //摩托罗拉字节序
      let row = Math.floor(bitStart / 8);
      let col = 7 - (bitStart % 8);
      for (var k = 0; k < bitLength; k++) {
        if (col >= 0) {
          resultArray.push(canDataArray[row][col]);
          col--;
        } else {
          row--;
          col = 6;
          resultArray.push(canDataArray[row][7]);
        }
      }
      resultArray = resultArray.slice().reverse();
    }

    let res = resultArray.join("");
    decimalValue = Tools.parseVariableLengthBinaryString(res, isSigned);
    // 将二进制字符串转换为十进制数值
    // const decimalValue = "-" + parseInt(res, 2);
    precision = parseFloat(precision);
    const physicalValue = precision * decimalValue + parseInt(offset);
    return physicalValue;
  },

  /**
   * 字节转换为矩阵
   * @param {*} hexArray
   * @returns
   */
  drawMatrix: (hexArray) => {
    const matrix = Array.from({ length: 8 }, () =>
      Array.from({ length: hexArray.length }).fill(0)
    );

    // 遍历每个字节
    hexArray.forEach((byte, byteIndex) => {
      // 将十六进制字节转换为十进制
      const decimalValue = parseInt(byte, 16);
      // 将十进制值转换为二进制字符串
      const binaryString = decimalValue.toString(2).padStart(8, "0");
      // 直接使用 map 处理每个位
      binaryString.split("").map((bit, bitIndex) => {
        matrix[byteIndex][bitIndex] = bit;
      });
    });
    return matrix;
  },

  /**
   * echart组件
   * @param {*} rawData  数据
   */
  drawPoint: (rawData) => {
    // 获取图表容器
    var chartContainer = document.getElementById("chartContainer");

    // 创建 ECharts 实例
    var myChart = echarts.init(chartContainer);

    // 假设你的数据是这样的

    // 对数据进行处理，将其转换为 ECharts 所需的格式
    var echartsData = {
      series: [
        {
          type: "line",
          data: rawData.map((dataPoint) => ({
            value: dataPoint[0],
            name: dataPoint[1],
          })),
        },
      ],
    };

    // 配置图表选项
    var option = {
      xAxis: {
        name: "时间",
        type: "category",
        data: echartsData.series[0].data.map((dataPoint) => dataPoint.name),
        splitLine: {
          show: true,
          lineStyle: {
            type: "dashed", // You can also use 'solid', 'dotted', etc.
          },
        },
      },
      yAxis: {
        type: "value",
        splitLine: {
          show: true,
          lineStyle: {
            type: "dashed", // You can also use 'solid', 'dotted', etc.
          },
        },
      },
      series: echartsData.series,
      dataZoom: [
        {
          type: "slider", // 滑动条型
          start: 0, // 数据窗口范围的起始百分比
          end: 100, // 数据窗口范围的结束百分比
          showDataShadow: true, // 是否显示数据阴影
          handleSize: 8, // 滑动条的手柄大小
        },
        {
          type: "inside", // 内部缩放
        },
      ],
      // 添加还原按钮
      restore: {
        show: true,
      },
      // 添加保存为图片按钮
      saveAsImage: {
        show: true,
      },
    };

    // 使用配置项设置图表
    myChart.setOption(option);
  },

  /**
   *
   * @param {*} binaryString  二进制字符串
   * @param {*} isSigned  是否是无符号
   * @returns
   */
  parseVariableLengthBinaryString: (binaryString, isSigned) => {
    // 如果长度不为1，解析为整数
    const decimalNumber = parseInt(binaryString, 2);

    // 判断是否应该处理为负数
    if (isSigned == 2 && binaryString[0] === "1") {
      const maxInt = Math.pow(2, binaryString.length - 1) - 1;
      if (decimalNumber > maxInt) {
        return decimalNumber - Math.pow(2, binaryString.length);
      }
    }

    return decimalNumber;
  },
};
