const fs = require("fs-extra");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { parse } = require("csv-parse");
const { stringify } = require("csv-stringify");
const ListedLicenses = require("../model/listedLicenses");

const columns = ["name", "artist name", "license name"];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/csvfiles");
  },

  filename: function (req, file, cb) {
    cb(null, uuidv4() + "-" + Date.now() + path.extname(file.originalname));
  },
});

const uploadCSV = async (req, res) => {
  try {
    let upload = multer({ storage: storage }).single("csvFile");
    upload(req, res, async function (err) {
      if (!req?.files || req.files?.length === 0) {
        res
          .status(200)
          .json({ message: "please select the one file at least" });
        return;
      }

      if (!fs.existsSync(`./uploads/csvfiles/`)) {
        fs.mkdirsSync(`./uploads/csvfiles/`);
      }

      const file = req?.files?.csvFile;

      const filePath =
        `./uploads/csvfiles/` + uuidv4() + "-" + Date.now() + file.name;
      await file.mv(filePath);

      const outputFilePath =
        `/uploads/csvfiles/` + uuidv4() + "-" + Date.now() + file.name;

      const writableStream = fs.createWriteStream(`.${outputFilePath}`);
      const stringifier = stringify({ header: true, columns: columns });
      let rowNumber = 0;
      fs.createReadStream(filePath)
        .pipe(parse({ delimiter: ",", from_line: 2 }))
        .on("data", async function (row) {
          try {
            if (row) {
              const listed = await ListedLicenses.findOne({
                sellerName: { $regex: row[1], $options: "i" },
                licenseName: { $regex: row[2], $options: "i" },
              });
              if (!listed) {
                stringifier.write(row);
                rowNumber++;
              }
            }
          } catch (e) {
            console.log("error in reading rows", e);
            res
              .status(500)
              .json({ msg: "Something went wrong", success: false });
          }
        })
        .on("end", () => {
          // End the writer to finish writing to the output file
          stringifier.pipe(writableStream);
          fs.unlinkSync(filePath);
          console.log("CSV file processing completed.");
          res.status(200).json({
            msg: "success",
            success: true,
            data: {
              path: outputFilePath,
              pageNumber: rowNumber / 5 + 1,
            },
          });
        })
        .on("error", function (err) {
          res.status(500).json({ msg: "Something went wrong", success: false });
        });
    });
  } catch (e) {
    res.status(500).json({ msg: resMsg.error, success: false });
  }
};

const readCSV = async (req, res) => {
  try {
    const { path, pageNumber, pageStep } = req.body;
    const rowArray = [];
    fs.createReadStream(`.${path}`)
      .pipe(
        parse({
          delimiter: ",",
          from_line: 2 + pageStep * pageNumber,
          to_line: 2 + pageStep * (pageNumber + 1),
        })
      )
      .on("data", async function (row) {
        if (row) {
          rowArray.push(row);
        }
      })
      .on("end", () => {
        console.log("CSV file processing completed.");
        res.status(200).json({ msg: "success", success: true, data: rowArray });
      });
  } catch (e) {
    console.log("error in reading csv file", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

module.exports = {
  uploadCSV,
  readCSV,
};
