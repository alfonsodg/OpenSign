import {
  useEffect,
  useState,
  forwardRef,
  useRef
} from "react";
import {
  onChangeInput,
  defaultWidthHeight,
  radioButtonWidget,
  textInputWidget,
  cellsWidget,
  textWidget,
  selectCheckbox,
  isBase64,
  drawWidget,
  changeDateToMomentFormat
} from "../../constant/Utils";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../../styles/signature.css";
import { useTranslation } from "react-i18next";
import CellsWidget from "./CellsWidget";
import { useSelector } from "react-redux";
import Loader from "../../primitives/Loader";
import moment from "moment";

const textWidgetCls =
  "w-full h-full md:min-w-full md:min-h-full z-[999] text-[12px] overflow-hidden resize-none outline-none text-base-content item-center whitespace-pre-wrap";
const widgetCls =
  "select-none-cls overflow-hidden w-full h-full text-black flex flex-col justify-center items-center";
function PlaceholderType(props) {
  const selectWidgetCls = `w-full h-full absolute left-0 top-0 focus:outline-none text-base-content`;
  const { t } = useTranslation();
  const textRef = useRef();
  const prefillImg = useSelector((state) => state.widget.prefillImg);
  const prefillImgLoad = useSelector((state) => state.widget.prefillImgLoad);
  const defaultData = props?.pos?.options?.defaultValue;
  const response = props?.pos?.options?.response;
  const type = props?.pos?.type;
  const iswidgetEnable =
    props.isSignYourself ||
    ((props.isSelfSign || props.isNeedSign) &&
      props.data?.signerObjId === props.signerObjId);
  const isReadOnly =
    props?.data?.Role !== "prefill" &&
    (props.pos.options?.isReadOnly ||
      props.data?.signerObjId !== props.signerObjId);
  // In-field editing: the signer edits their own widgets, and the authoring
  // flows edit placeholders directly on the page.
  const isOwnWidget =
    props.data?.signerObjId &&
    props.data?.signerObjId === props.signerObjId &&
    !props.pos?.options?.isReadOnly;
  const canEditInline =
    (props.isPlaceholder && !props.isNeedSign) ||
    ((props.isNeedSign || props.isSelfSign || props.isSignYourself) &&
      iswidgetEnable &&
      !isReadOnly) ||
    !!isOwnWidget;
  // prefer the latest response value over any default value
  //props?.isPrefillModal is used to handle in create template flow when user use use-template button
  //then prefill details should not be reflect on pdf document it should only show in modal
  const widgetData = !props?.isPrefillModal
    ? (props.pos?.options?.response ?? props.pos?.options?.defaultValue ?? "")
    : "";
  const [widgetValue, setwidgetValue] = useState();
  const [selectedCheckbox, setSelectedCheckbox] = useState([]);
  const [imgUrl, setImgUrl] = useState("");
  const [date, setDate] = useState("");
  const fontSize = props.calculateFont(props.pos.options?.fontSize);
  const fontColor = props.pos.options?.fontColor || "black";
  const textWidgetStyle = {
    fontSize: fontSize,
    color: fontColor,
    fontFamily: "Arial, sans-serif",
    overflow: "hidden",
    textAlign: "start",
    width: "100%",
    display: "flex",
    height: "100%"
  };
  useEffect(() => {
    if (!props?.isPrefillModal) {
      if (type !== "date") {
        if (type && type === "checkbox") {
          setSelectedCheckbox(response || defaultData || []);
        }
        else {
          // keep displayed value in sync with the stored response
          setwidgetValue(widgetData);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.pos, widgetData, type]);


  const ExampleCustomInput = forwardRef(({ value, onClick }, ref) => (
    <div
      style={{
        fontSize: fontSize,
        color: fontColor,
        fontFamily: "Arial, sans-serif"
      }}
      className={`${isReadOnly ? `select-none opacity-25` : ``} ${selectWidgetCls} overflow-hidden`}
      onClick={onClick}
      ref={ref}
    >
      {value}
      <i className="fa-light fa-calendar ml-[5px]"></i>
    </div>
  ));
  ExampleCustomInput.displayName = "ExampleCustomInput";

  // Extract string label from a radio/checkbox value entry which may be
  // either a plain string or an object like { name: string, checked: boolean }
  const getRadioLabel = (data) => {
    if (typeof data === "string") return data;
    if (data && typeof data === "object" && data.name != null)
      return String(data.name);
    return "";
  };

  const handleRadioCheck = (data) => {
    if (!props?.isPrefillModal) {
      const defaultData = widgetValue
        ? widgetValue?.trim()
        : props.pos?.options?.defaultValue
          ? props.pos?.options?.defaultValue?.trim()
          : "";
      return defaultData === data?.trim();
    }
  };
  //function is used to get prefill image's signedUrl after expired
  useEffect(() => {
    const loadImage = async () => {
      const isBase64Url = isBase64(props?.pos?.SignUrl);
      if (
        props.pos.SignUrl &&
        props.pos.type === "image" &&
        props?.data?.Role === "prefill" &&
        !isBase64Url
      ) {
        const getPrefillImg = prefillImg?.find((x) => x.id === props.pos.key);
        if (getPrefillImg) {
          setImgUrl(getPrefillImg?.base64);
        }
      } else {
        setImgUrl(props.pos.SignUrl);
      }
    };
    if (!props?.isPrefillModal) {
      loadImage();
    }
  }, [props.pos.SignUrl]);

  const formatWidgetName = () => {
    const widgetName = props?.pos?.options?.name;
    const name = widgetName ? widgetName?.split(`-`) : ["-", "-", "-"];
    const lastWord = name.length > 1 ? `-${name[name.length - 1]}` : "";
    const title =
      props?.pos?.type === name[0] ? `${name[0]}${lastWord}` : widgetName;
    return defaultData || props?.pos?.options?.hint || title;
  };
  // Convert rendered line heights back to PDF units before growing the widget.
  useEffect(() => {
    if (!textRef.current) return;
    if (
      (type === "text" || type === textInputWidget) &&
      textRef.current &&
      widgetData
    ) {
      const lines = widgetData.split("\n").length;
      const containerScale = parseFloat(props.calculateFont(1));
      const style = window.getComputedStyle(textRef.current);
      const lineHeight =
        style.lineHeight === "normal"
          ? parseFloat(style.fontSize) * 1.5
          : parseFloat(style.lineHeight);
      const textWidgetHeight = (lines * lineHeight) / containerScale;
      const dimension = [90, 270].includes(props.pos.options?.rotation)
        ? "Width"
        : "Height";
      const currentHeight =
        props.pos[dimension] ||
        defaultWidthHeight(type)[dimension.toLowerCase()];
      if (textWidgetHeight <= currentHeight) return;

      onChangeInput(
        null,
        props.pos,
        props?.xyPosition,
        props.index,
        props?.setXyPosition,
        props.data && props.data.Id,
        null,
        null,
        null,
        null,
        null,
        textWidgetHeight
      );
    }
  }, [widgetValue]);

  useEffect(() => {
    if (props?.startDate) {
      const format =
        props?.selectDate?.format ||
        props.pos?.options?.validation?.format ||
        "MM/dd/yyyy";
      const momentFormat = changeDateToMomentFormat(format);
      const updatedDate = moment(props?.startDate).format(momentFormat);
      setDate(updatedDate);
    } else {
      setDate("");
    }
  }, [props?.startDate, props?.selectDate?.format]);

  switch (type) {
    case "signature": {
      const sigRotation = props.pos.options?.rotation;
      const sigIsSwapped = [90, 270].includes(sigRotation);
      const sigImgStyle = sigRotation
        ? sigIsSwapped &&
          props.pos.signatureType === "type" &&
          props.pos.Width &&
          props.pos.Height
          ? {
              transform: `rotate(${sigRotation}deg) scaleX(${props.pos.Width / props.pos.Height}) scaleY(${props.pos.Height / props.pos.Width})`
            }
          : { transform: `rotate(${sigRotation}deg)` }
        : undefined;
      return props.pos.SignUrl ? (
        <img
          alt="signature"
          draggable="false"
          src={props.pos.SignUrl}
          style={sigImgStyle}
          className={`${props.pos.signatureType !== "type" ? "object-contain" : ""} w-full h-full select-none-cls`}
        />
      ) : (
        <div className={widgetCls}>
          {props.pos.type && (
            <div
              style={{
                fontSize: props.pos
                  ? props.calculateFontsize(props.pos)
                  : "11px",
                ...(sigRotation
                  ? { transform: `rotate(${sigRotation}deg)` }
                  : {})
              }}
              className={`${sigIsSwapped ? "whitespace-nowrap" : ""} font-medium`}
            >
              {formatWidgetName()}
            </div>
          )}
        </div>
      );
    }
    case "stamp":
      return props.pos.SignUrl ? (
        <img
          alt="stamp"
          draggable="false"
          src={props.pos.SignUrl}
          className="w-full h-full select-none-cls object-contain"
        />
      ) : (
        <div className={widgetCls}>
          {props.pos.type && (
            <div
              style={{
                fontSize: props.pos
                  ? props.calculateFontsize(props.pos)
                  : "11px"
              }}
              className="font-medium"
            >
              {formatWidgetName()}
            </div>
          )}
        </div>
      );
    case "checkbox":
      const checkBoxLayout = props.pos.options?.layout || "vertical";
      const isMultipleCheckbox =
        props.pos.options?.values?.length > 0 ? true : false;
      const checkboxSize = parseFloat(fontSize);
      // Scaled gaps
      const checkboxGapX = `${checkboxSize * 0.8}px`; // was gap-x-2 (fixed 8px)
      const checkboxGapY = `${checkboxSize * 0.4}px`; // was gap-y-[3px] (fixed 3px)

      const checkBoxWrapperClass = `flex items-start whitespace-pre-wrap ${
        checkBoxLayout === "horizontal"
          ? `flex-row flex-wrap lg:py-[1.6px]`
          : `flex-col`
      }`;

      return (
        <div
          className={checkBoxWrapperClass}
          style={{
            zIndex: props.isSignYourself && "99",
            width: "100%",
            height: "100%",
            overflow: "hidden",
            //Scaled gap with same condition as before
            gap: isMultipleCheckbox
              ? checkBoxLayout === "horizontal"
                ? checkboxGapX // was gap-x-2
                : checkboxGapY // was gap-y-[3px]
              : undefined
          }}
        >
          {props.pos.options?.values?.map((data, ind) => {
            const isAuthoring = canEditInline;
            return (
            <div key={ind} className={isAuthoring ? "" : "select-none-cls pointer-events-none"}>
              <label
                htmlFor={`checkbox-${props.pos.key + ind}`}
                style={{
                  fontSize: fontSize,
                  color: fontColor,
                  gap: `${checkboxSize * 0.2}px` //scaled inner gap (was gap-1)
                }}
                className="mb-0 flex items-center" //removed gap-1 (fixed 4px)
              >
                <input
                  id={`checkbox-${props.pos.key + ind}`}
                  style={{
                    width: fontSize,
                    height: fontSize,
                    flexShrink: 0 //prevent flex compression
                  }}
                  className="op-checkbox rounded-[1px]"
                  disabled={props.isNeedSign && isReadOnly}
                  type="checkbox"
                  readOnly={!isAuthoring}
                  checked={
                    isAuthoring
                      ? selectedCheckbox?.includes(ind)
                      : !props?.isPrefillModal
                        ? !!selectCheckbox(ind, selectedCheckbox)
                        : false
                  }
                  onClick={(e) => {
                    if (isAuthoring) e.stopPropagation();
                  }}
                  onChange={(e) => {
                    if (!isAuthoring) return;
                    const isChecked = e.target.checked;
                    let updateSelectedCheckbox = selectedCheckbox
                      ? [...selectedCheckbox]
                      : [];
                    if (isChecked) {
                      const maxRequired =
                        props.pos?.options?.validation?.maxRequiredCount;
                      if (
                        typeof maxRequired === "number" &&
                        maxRequired > 0 &&
                        updateSelectedCheckbox.length >= maxRequired
                      ) {
                        return;
                      }
                      updateSelectedCheckbox.push(ind);
                    } else {
                      updateSelectedCheckbox = updateSelectedCheckbox.filter(
                        (d) => d !== ind
                      );
                    }
                    setSelectedCheckbox(updateSelectedCheckbox);
                    if (props.setXyPosition) {
                      onChangeInput(
                        updateSelectedCheckbox,
                        props.pos,
                        props.xyPosition,
                        props.index,
                        props.setXyPosition,
                        props.data?.Id || props.uniqueId,
                        false,
                        null,
                        props.pos?.options?.fontSize || 12,
                        props.pos?.options?.fontColor || "black",
                        null,
                        null
                      );
                    }
                  }}
                />
                {!props.pos.options?.isHideLabel && (
                  <span className="leading-none">{data}</span>
                )}
              </label>
            </div>
            );
          })}
        </div>
      );
    case textInputWidget:
      return props.isSignYourself || iswidgetEnable ? (
        <textarea
          placeholder={formatWidgetName()}
          ref={textRef}
          rows={50}
          value={
                widgetValue
          }
          className={`w-full resize-none overflow-hidden text-base-content item-center outline-none ${isReadOnly ? "select-none" : ""}`}
          style={{
            fontSize: fontSize,
            color: fontColor,
            background: isReadOnly ? props.data?.blockColor : "white",
            pointerEvents: canEditInline ? "auto" : "none"
          }}
          name="text"
          readOnly={!canEditInline}
          onChange={(e) => {
            if (!canEditInline) return;
            const val = e.target.value;
            setwidgetValue(val);
            if (props.setXyPosition) {
              onChangeInput(
                val,
                props.pos,
                props.xyPosition,
                props.index,
                props.setXyPosition,
                props.data?.Id || props.uniqueId,
                false,
                null,
                props.pos?.options?.fontSize || 12,
                props.pos?.options?.fontColor || "black",
                null,
                null
              );
            }
          }}
          disabled={props.isNeedSign && isReadOnly}
          cols="50"
        />
      ) : (
        <div style={textWidgetStyle} className="select-none-cls">
          <span className="ml-0.5">{formatWidgetName()}</span>
        </div>
      );
    case cellsWidget: {
      const count = props.pos.options?.cellCount || 5;
      const cells = (widgetValue || "").split("");
      const height = "100%";
      const fontSize = props.calculateFont(props.pos.options?.fontSize);
      const fontColor = props.pos.options?.fontColor || "black";
      const handleCellResize = (newCount) => {
        if (props.setCellCount) props.setCellCount(props.pos.key, newCount);
      };
      const isEditable =
        props.isPlaceholder || props.isSignYourself || props.isSelfSign;
      return (
        <CellsWidget
          isEnabled={iswidgetEnable}
          count={count}
          height={height}
          value={
                cells.join("")
          }
          editable={isEditable}
          resizable={props?.isAllowModify}
          fontSize={fontSize}
          fontColor={fontColor}
          hint={formatWidgetName()}
          onCellCountChange={handleCellResize}
        />
      );
    }
case "dropdown": {
        // Saved values can be arrays; options can be objects with a name.
        const normalizeOption = (option) => {
          if (option == null) return "";
          if (typeof option === "object") {
            return String(option.name ?? option.value ?? "");
          }
          return String(option);
        };
        const dropdownValue = Array.isArray(widgetData)
          ? widgetData.map(normalizeOption).join(", ")
          : normalizeOption(widgetData);
        const selectedValue = Array.isArray(widgetValue)
          ? widgetValue.map(normalizeOption)
          : widgetValue
            ? [normalizeOption(widgetValue)]
            : [];
        if (canEditInline && props.pos?.options?.isMultiSelect) {
          const persist = (next) => {
            setwidgetValue(next);
            if (props.setXyPosition) {
              onChangeInput(
                next,
                props.pos,
                props.xyPosition,
                props.index,
                props.setXyPosition,
                props.data?.Id || props.uniqueId,
                false,
                null,
                props.pos?.options?.fontSize || 12,
                props.pos?.options?.fontColor || "black",
                null,
                null
              );
            }
          };
          return (
            <div
              className="flex h-full w-full flex-col overflow-auto"
              style={{ fontSize: fontSize, color: fontColor }}
            >
              {(props.pos?.options?.values || []).map((data, ind) => {
                const optionLabel = normalizeOption(data);
                return (
                  <label
                    key={ind}
                    className="mb-0 flex items-center"
                    style={{ gap: `${Math.max(fontSize * 0.2, 2)}px` }}
                  >
                    <input
                      type="checkbox"
                      className="op-checkbox rounded-[1px]"
                      style={{
                        width: fontSize,
                        height: fontSize,
                        flexShrink: 0
                      }}
                      checked={selectedValue.includes(optionLabel)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selectedValue, optionLabel]
                          : selectedValue.filter((val) => val !== optionLabel);
                        persist(next);
                      }}
                    />
                    <span className="leading-none">{optionLabel}</span>
                  </label>
                );
              })}
            </div>
          );
        }
        return canEditInline ? (
          <select
            value={selectedValue.join(", ")}
            onChange={(e) => {
              const val = e.target.value;
              setwidgetValue(val);
              if (props.setXyPosition) {
                onChangeInput(
                  val,
                  props.pos,
                  props.xyPosition,
                  props.index,
                  props.setXyPosition,
                  props.data?.Id || props.uniqueId,
                  false,
                  null,
                  props.pos?.options?.fontSize || 12,
                  props.pos?.options?.fontColor || "black",
                  null,
                  null
                );
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full h-full text-base-content outline-none bg-transparent"
            style={{ fontSize: fontSize, color: fontColor }}
          >
            <option value="" disabled hidden>
              {t("choose-one")}
            </option>
            {(props.pos?.options?.values || []).map((data, ind) => (
              <option key={ind} value={normalizeOption(data)}>
                {normalizeOption(data)}
              </option>
            ))}
          </select>
        ) : (
          <div
            style={textWidgetStyle}
            className="select-none-cls flex justify-between items-center"
          >
            {dropdownValue || t("choose-one")}
            <i className="fa-light fa-circle-chevron-down mr-1 "></i>
          </div>
        );
      }
    case "initials": {
      const iniRotation = props.pos.options?.rotation;
      const iniIsSwapped = [90, 270].includes(iniRotation);
      const iniImgStyle = iniRotation
        ? iniIsSwapped &&
          props.pos.signatureType === "type" &&
          props.pos.Width &&
          props.pos.Height
          ? {
              transform: `rotate(${iniRotation}deg) scaleX(${props.pos.Width / props.pos.Height}) scaleY(${props.pos.Height / props.pos.Width})`
            }
          : { transform: `rotate(${iniRotation}deg)` }
        : undefined;
      return props.pos.SignUrl ? (
        <img
          alt="initials"
          draggable="false"
          src={props.pos.SignUrl}
          style={iniImgStyle}
          className={`${props.pos.signatureType !== "type" ? "object-contain" : ""} w-full h-full select-none-cls`}
        />
      ) : (
        <div className={widgetCls}>
          {props.pos.type && (
            <div
              style={{
                fontSize: props.pos
                  ? props.calculateFontsize(props.pos)
                  : "11px",
                ...(iniRotation
                  ? { transform: `rotate(${iniRotation}deg)` }
                  : {}),
                ...(iniIsSwapped ? { whiteSpace: "nowrap" } : {})
              }}
              className="font-medium text-center"
            >
              {formatWidgetName()}
            </div>
          )}
        </div>
      );
    }
    case "initials": {
      const iniRotation = props.pos.options?.rotation;
      const iniIsSwapped = [90, 270].includes(iniRotation);
      const iniImgStyle = iniRotation
        ? iniIsSwapped &&
          props.pos.signatureType === "type" &&
          props.pos.Width &&
          props.pos.Height
          ? {
              transform: `rotate(${iniRotation}deg) scaleX(${props.pos.Width / props.pos.Height}) scaleY(${props.pos.Height / props.pos.Width})`
            }
          : { transform: `rotate(${iniRotation}deg)` }
        : undefined;
      return props.pos.SignUrl ? (
        <img
          alt="initials"
          draggable="false"
          src={props.pos.SignUrl}
          style={iniImgStyle}
          className={`${props.pos.signatureType !== "type" ? "object-contain" : ""} w-full h-full select-none-cls`}
        />
      ) : (
        <div className={widgetCls}>
          {props.pos.type && (
            <div
              style={{
                fontSize: props.pos
                  ? props.calculateFontsize(props.pos)
                  : "11px",
                ...(iniRotation
                  ? { transform: `rotate(${iniRotation}deg)` }
                  : {}),
                ...(iniIsSwapped ? { whiteSpace: "nowrap" } : {})
              }}
              className="font-medium text-center"
            >
              {formatWidgetName()}
            </div>
          )}
        </div>
      );
    }
    case "name":
      return iswidgetEnable ? (
        <textarea
          readOnly
          placeholder={formatWidgetName()}
          rows={1}
          value={
                widgetValue
          }
          className={`${textWidgetCls} ${isReadOnly ? "select-none" : ""}`}
          style={{
            fontSize: fontSize,
            color: fontColor,
            background: isReadOnly ? props.data?.blockColor : "white",
            pointerEvents: "none"
          }}
          cols="50"
          disabled={props.isNeedSign && isReadOnly}
        />
      ) : (
        <div className="flex h-full select-none-cls" style={textWidgetStyle}>
          <span className="ml-0.5">{formatWidgetName()}</span>
        </div>
      );
    case "company":
      return iswidgetEnable ? (
        <textarea
          readOnly
          placeholder={formatWidgetName()}
          rows={1}
          value={
                widgetValue
          }
          className={`${textWidgetCls} ${isReadOnly ? "select-none" : ""}`}
          style={{
            fontSize: fontSize,
            color: fontColor,
            background: isReadOnly ? props.data?.blockColor : "white",
            pointerEvents: "none"
          }}
          cols="50"
          disabled={props.isNeedSign && isReadOnly}
        />
      ) : (
        <div style={textWidgetStyle} className="select-none-cls">
          <span className="ml-0.5">{formatWidgetName()}</span>
        </div>
      );
    case "job title":
      return iswidgetEnable ? (
        <textarea
          readOnly
          placeholder={formatWidgetName()}
          rows={1}
          value={
                widgetValue
          }
          className={`${textWidgetCls} ${isReadOnly ? "select-none" : ""}`}
          style={{
            fontSize: fontSize,
            color: fontColor,
            background: isReadOnly ? props.data?.blockColor : "white",
            pointerEvents: "none"
          }}
          cols="50"
          disabled={props.isNeedSign && isReadOnly}
        />
      ) : (
        <div style={textWidgetStyle} className="select-none-cls">
          <span className="ml-0.5">{formatWidgetName()}</span>
        </div>
      );
    case "date": {
      const dateFormat =
        props?.selectDate?.format ||
        props.pos?.options?.validation?.format ||
        "MM/dd/yyyy";
      const momentFormat = changeDateToMomentFormat(dateFormat);
      const savedDate =
        props.pos?.options?.response ||
        (defaultData !== "today" ? defaultData : "");
      const savedMoment = savedDate ? moment(savedDate, momentFormat, true) : null;
      if (canEditInline && (iswidgetEnable || props?.data?.Role === "prefill")) {
        return (
          <div
            className="h-full w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <DatePicker
              selected={
                savedMoment && savedMoment.isValid()
                  ? savedMoment.toDate()
                  : null
              }
              onChange={(value) => {
                const text = value ? moment(value).format(momentFormat) : "";
                if (!props.setXyPosition) return;
                onChangeInput(
                  text,
                  props.pos,
                  props.xyPosition,
                  props.index,
                  props.setXyPosition,
                  props.data?.Id || props.uniqueId,
                  false,
                  dateFormat,
                  props.pos?.options?.fontSize || 12,
                  props.pos?.options?.fontColor || "black",
                  null,
                  null
                );
              }}
              dateFormat={momentFormat}
              popperPlacement="bottom-end"
              portalId="datepicker-portal-root"
              popperProps={{ strategy: "fixed" }}
              customInput={
                <input
                  style={{ fontSize: fontSize, color: fontColor }}
                  className="h-full w-full cursor-pointer bg-transparent outline-none"
                  readOnly
                />
              }
            />
          </div>
        );
      }
      return iswidgetEnable || props?.data?.Role === "prefill" ? (
        <div className={`${selectWidgetCls} outline-[#007bff]`}>
          <span
            style={{ fontSize: fontSize, color: fontColor }}
            className={`${isReadOnly ? `select-none opacity-25` : ``} ${selectWidgetCls} overflow-hidden`}
          >
            {date}
            <i className="fa-light fa-calendar text-[10px] ml-[5px]"></i>
          </span>
        </div>
      ) : (
        <div
          style={textWidgetStyle}
          className="select-none-cls overflow-hidden"
        >
          <span>
            {(defaultData !== "today" && defaultData) ||
              (response !== "today" && response) ||
              props?.selectDate?.format ||
              props.pos?.options?.validation?.format ||
              "MM/dd/yyyy"}
          </span>
        </div>
      );
    }
    case "image":
      return prefillImgLoad[props.pos?.key] ? (
        <div className="absolute w-full h-full inset-0 flex justify-center items-center bg-white/30 z-50">
          <Loader />
        </div>
      ) : imgUrl ? (
        <img
          alt="image"
          draggable="false"
          src={imgUrl}
          className="w-full h-full select-none-cls object-contain"
        />
      ) : (
        <div className={widgetCls}>
          {props.pos.type && (
            <div
              style={{
                fontSize: props.pos
                  ? props.calculateFontsize(props.pos)
                  : "11px"
              }}
              className="font-medium text-center"
            >
              {formatWidgetName()}
            </div>
          )}
        </div>
      );
    case "email":
      return iswidgetEnable ? (
        <textarea
          readOnly
          placeholder={formatWidgetName()}
          rows={1}
          value={
                widgetValue
          }
          className={`${textWidgetCls} ${isReadOnly ? "select-none" : ""}`}
          style={{
            fontSize: fontSize,
            color: fontColor,
            background: isReadOnly ? props.data?.blockColor : "white",
            pointerEvents: "none"
          }}
          cols="1"
          disabled={props.isNeedSign && isReadOnly}
        />
      ) : (
        <div style={textWidgetStyle} className="select-none-cls">
          <span className="ml-0.5">{formatWidgetName()}</span>
        </div>
      );
    case radioButtonWidget:
      const radioLayout = props.pos.options?.layout || "vertical";
      const isOnlyOneBtn = props.pos.options?.values?.length > 0 ? true : false;
      const radioSize = parseFloat(fontSize);
      //Scaled gaps based on radioSize
      const scaledGapX = `${radioSize * 0.8}px`; // horizontal gap between items
      const scaledGapY = `${radioSize * 0.4}px`; // vertical gap between items

      const radioWrapperClass = `flex items-start whitespace-pre-wrap ${
        radioLayout === "horizontal"
          ? `flex-row flex-wrap lg:py-[1.6px]`
          : `flex-col`
      }`;

      return (
        <div
          className={radioWrapperClass}
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            //Scaled gap with condition same as before
            gap: isOnlyOneBtn
              ? radioLayout === "horizontal"
                ? scaledGapX // was gap-x-[10px]
                : scaledGapY // was gap-y-[5px]
              : undefined
          }}
        >
          {props.pos.options?.values.map((data, ind) => (
            <div
              key={ind}
              className={canEditInline ? "" : "select-none-cls pointer-events-none"}
            >
              <label
                htmlFor={`radio-${props.pos.key + ind}`}
                style={{
                  fontSize: fontSize,
                  color: fontColor,
                  gap: `${radioSize * 0.2}px` //scaled inner gap (was gap-1)
                }}
                className="mb-0 flex items-center" //removed text-xs
              >
                <input
                  readOnly={!canEditInline}
                  id={`radio-${props.pos.key + ind}`}
                  onChange={() => {
                    if (!canEditInline) return;
                    if (props.setXyPosition) {
                      onChangeInput(
                        data,
                        props.pos,
                        props.xyPosition,
                        props.index,
                        props.setXyPosition,
                        props.data?.Id || props.uniqueId,
                        false,
                        null,
                        props.pos?.options?.fontSize || 12,
                        props.pos?.options?.fontColor || "black",
                        null,
                        null
                      );
                    }
                  }}
                  style={{
                    width: fontSize,
                    height: fontSize,
                    flexShrink: 0
                  }}
                  className={`op-radio rounded-full border-black appearance-none bg-white inline-block align-middle relative ${
                    handleRadioCheck(data) ? "checked-radio" : ""
                  }`}
                  type="radio"
                  disabled={props.isNeedSign && isReadOnly}
                  checked={handleRadioCheck(data)}
                />
                {!props.pos.options?.isHideLabel && (
                  <span className="leading-none">
                    {getRadioLabel(data).trim()}
                  </span>
                )}
              </label>
            </div>
          ))}
        </div>
      );
case textWidget:
        return (
          <textarea
            name="text"
            ref={textRef}
            readOnly={!(canEditInline)}
            placeholder={t("widgets-name.text")}
            rows={50}
            cols={50}
            value={
                  widgetValue
            }
            style={{
              fontFamily: UI_FONT,
              fontSize: fontSize,
              color: fontColor,
              background: "white",
              pointerEvents: canEditInline ? "auto" : "none",
            WebkitTextSecurity: props.pos?.options?.isMasked ? "disc" : "none"
            }}
            className="w-full resize-none overflow-hidden text-base-content item-center outline-none"
            onClick={(e) => {
              if (canEditInline) e.stopPropagation();
            }}
            onChange={(e) => {
              if (canEditInline) {
                const val = e.target.value;
                setwidgetValue(val);
                if (props.setXyPosition) {
                  onChangeInput(
                    val,
                    props.pos,
                    props.xyPosition,
                    props.index,
                    props.setXyPosition,
                    props.data?.Id || props.uniqueId,
                    false,
                    null,
                    props.pos?.options?.fontSize || 12,
                    props.pos?.options?.fontColor || "black",
                    null,
                    null
                  );
                }
              }
            }}
          />
        );
    case textWidget:
      return (
        <textarea
          name="text"
          ref={textRef}
          readOnly
          placeholder={t("widgets-name.text")}
          rows={50}
          cols={50}
          defaultValue={
                widgetValue
          }
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: fontSize,
            color: fontColor,
            background: "white"
          }}
          className="w-full resize-none overflow-hidden text-base-content item-center outline-none"
        />
      );
    case drawWidget:
      return prefillImgLoad[props.pos?.key] ? (
        <div className="absolute w-full h-full inset-0 flex justify-center items-center bg-white/30 z-50">
          <Loader />
        </div>
      ) : widgetValue ? (
        <img
          alt="signature"
          draggable="false"
          src={widgetValue}
          className={`${props.pos.signatureType !== "type" ? "object-contain" : ""} w-full h-full select-none-cls`}
        />
      ) : (
        <div className={widgetCls}>
          {props.pos.type && (
            <div
              style={{
                fontSize: props.pos
                  ? props.calculateFontsize(props.pos)
                  : "11px"
              }}
              className="font-medium"
            >
              {formatWidgetName()}
            </div>
          )}
        </div>
      );
    default:
      return props.pos.SignUrl ? (
        <div className="pointer-events-none">
          <img
            alt="image"
            draggable="false"
            src={props.pos.SignUrl}
            className="w-full h-full "
          />
        </div>
      ) : (
        <div className={widgetCls}>
          {props.pos.isStamp ? <div>stamp</div> : <div>signature</div>}
          {props.pos.type && (
            <div
              style={{
                fontSize: props.pos
                  ? props.calculateFontsize(props.pos)
                  : "11px"
              }}
              className="font-medium"
            >
              {formatWidgetName()}
            </div>
          )}
        </div>
      );
  }
}

export default PlaceholderType;
