import Swal from "sweetalert2";

/** App-wide Swal: no backdrop/Esc dismiss (use Cancel / confirm buttons only). */
const AppSwal = Swal.mixin({
  allowOutsideClick: false,
  allowEscapeKey: false,
});

export default AppSwal;
