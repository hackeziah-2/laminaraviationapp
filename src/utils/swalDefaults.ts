import Swal from "sweetalert2";

/**
 * App-wide Swal defaults.
 * scrollbarPadding/heightAuto off so dialogs do not reset window scroll
 * (important for list edit → soft refresh → preserve page/scroll).
 */
const AppSwal = Swal.mixin({
  allowOutsideClick: false,
  allowEscapeKey: false,
  scrollbarPadding: false,
  heightAuto: false,
});

export default AppSwal;
