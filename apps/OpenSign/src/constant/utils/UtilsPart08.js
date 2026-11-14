import { rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { getRuntimePdfFontUrl } from "../runtimeConfig";
import { fileasbytes } from "./UtilsPart01.js";
import { defaultWidthHeight } from "./UtilsPart04.js";
import { compensateRotation } from "./UtilsPart14.js";
import { appName } from "./UtilsPart01.js";
import { color } from "./UtilsPart01.js";

export const onChangeHeightOfTextArea = (
  height,
  widgetType,
  signKey,
  xyPosition,
  index,
  setXyPosition,
  userId
) => {
  const isSigners = xyPosition.some((data) => data.signerPtr);
  let filterSignerPos;
  if (isSigners) {
    if (userId) {
      filterSignerPos = xyPosition.filter((data) => data.Id === userId);
    }
    const getPlaceHolder = filterSignerPos[0]?.placeHolder;

    const getPageNumer = getPlaceHolder.filter(
      (data) => data.pageNumber === index
    );
    if (getPageNumer.length > 0) {
      const getXYdata = getPageNumer[0].pos;
      const getPosData = getXYdata;
      const addSignPos = getPosData.map((position) => {
        if (position.key === signKey) {
          return {
            ...position,
            Height: position.Height
              ? position.Height + height
              : defaultWidthHeight(widgetType).height + height
          };
        }
        return position;
      });
      const newUpdateSignPos = getPlaceHolder.map((obj) => {
        if (obj.pageNumber === index) {
          return { ...obj, pos: addSignPos };
        }
        return obj;
      });

      const newUpdateSigner = xyPosition.map((obj) => {
        if (obj.Id === userId) {
          return { ...obj, placeHolder: newUpdateSignPos };
        }
        return obj;
      });

      setXyPosition(newUpdateSigner);
    }
  } else {
    let getXYdata = xyPosition[index].pos;

    const updatePosition = getXYdata.map((position) => {
      if (position.key === signKey) {
        return {
          ...position,
          Height: position.Height
            ? position.Height + height
            : defaultWidthHeight(widgetType).height + height
        };
      }
      return position;
    });

    const updatePlaceholder = xyPosition.map((obj, ind) => {
      if (ind === index) {
        return { ...obj, pos: updatePosition };
      }
      return obj;
    });
    setXyPosition(updatePlaceholder);
  }
};

export const calculateInitialWidthHeight = (widgetData) => {
  const intialText = widgetData;
  const span = document.createElement("span");
  span.textContent = intialText;
  span.style.font = `12px`; // here put your text size and font family
  span.style.display = "hidden";
  document.body.appendChild(span);
  const width = span.offsetWidth;
  const height = span.offsetHeight;

  document.body.removeChild(span);
  return { getWidth: width, getHeight: height };
};

export const widgetDataValue = (type, value) => {
  switch (type) {
    case "name":
      return value?.Name || value?.name;
    case "company":
      return value?.Company || value?.company;
    case "job title":
      return value?.JobTitle || value?.jobTitle;
    case "email":
      return value?.Email || value?.email;
    default:
      return "";
  }
};

export const addInitialData = (signerPos, setXyPosition, value, userId) => {
  return signerPos.map((item) => {
    if (item.placeHolder && item.placeHolder.length > 0) {
      // If there is a nested array, recursively add the field to the last object
      if (item.Id === userId) {
        return {
          ...item,
          placeHolder: addInitialData(
            item.placeHolder,
            setXyPosition,
            value,
            userId
          )
        };
      } else {
        return item;
      }
    } else if (item.pos && item.pos.length > 0) {
      // If there is no nested array, add the new field
      return {
        ...item,
        pos: addInitialData(item.pos, setXyPosition, value, userId)
        // Adjust this line to add the desired field
      };
    } else {
      const widgetData = widgetDataValue(item.type, value);
      if (["name", "company", "job title", "email"].includes(item.type)) {
        return {
          ...item,
          options: {
            ...item.options,
            defaultValue: item?.options?.defaultValue || widgetData
          }
        };
      } else {
        return item;
      }
    }
  });
};

export const embedDocId = async (pdfOriginalWH, pdfDoc, documentId) => {
  const appName = "OpenSign™";
  // `fontBytes` is used to embed custom font in pdf
  const pdfFontUrl = getRuntimePdfFontUrl();
  if (!pdfFontUrl) throw new Error("A PDF font URL is required.");
  const fontBytes = await fileasbytes(pdfFontUrl);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });
  //pdfOriginalWH contained all pdf's pages width and height
  for (let i = 0; i < pdfOriginalWH?.length; i++) {
    const fontSize = 10;
    const textContent = documentId && `${appName} DocumentId: ${documentId} `;
    const pages = pdfDoc.getPages();
    const page = pages[i];
    const getSize = pdfOriginalWH[i];
    try {
      const getObj = compensateRotation(
        page.getRotation().angle,
        10,
        5,
        1,
        getSize,
        fontSize,
        rgb(0.5, 0.5, 0.5),
        font,
        page
      );
      page.drawText(textContent, getObj);
    } catch (err) {
      console.log("Err in embed docId on page", i + 1, err?.message);
    }
  }
};

export function convertTextToImg(fontStyle, text, color, widgetDims) {
  // read your widget dimensions:
  const maxWidth = widgetDims.Width;
  const maxHeight = widgetDims.Height;
  const baselineFontSizePx = maxHeight;
  const fontFamily = fontStyle || "Fasthand";
  const fillColor = color || "blue";

  // 1. Use a temporary canvas to measure actual text size
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.font = `${baselineFontSizePx}px ${fontFamily}`;
  const metrics = tempCtx.measureText(text);

  const actualHeight =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const actualWidth = metrics.width;

  // const renderscale = 3;
  // 2. Scale font size so text height fills canvas
  const scaleX = maxWidth / actualWidth;
  const scaleY = maxHeight / actualHeight;
  const scale = Math.min(scaleX, scaleY, 1);
  // final font-size
  // const finalFontSizePx = baselineFontSizePx * scale * renderscale;
  const finalFontSizePx = baselineFontSizePx * scale;
  // 3. Create the final canvas
  const pxRatio = window.devicePixelRatio * 2 || 3;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(maxWidth * pxRatio);
  canvas.height = Math.ceil(maxHeight * pxRatio);
  const ctx = canvas.getContext("2d");
  ctx.scale(pxRatio, pxRatio);

  // 4. Setup text with final font
  ctx.font = `${finalFontSizePx}px ${fontFamily}`;
  ctx.fillStyle = fillColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const newMetrics = ctx.measureText(text);
  const ascent = newMetrics.actualBoundingBoxAscent;
  const descent = newMetrics.actualBoundingBoxDescent;

  // 5. Align text vertically so it touches top and bottom
  const y = maxHeight / 2 + (ascent - descent) / 2;

  ctx.clearRect(0, 0, maxWidth, maxHeight);
  ctx.fillText(text, maxWidth / 2, y);

  // 6. Output image
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl;
}
