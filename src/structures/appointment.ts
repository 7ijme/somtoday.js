import Attachment from "./attachment";
import baseApiClass from "../baseApiClass";
import Course from "./course";
import Establishment from "./establishment";
import {
  api_afspraken,
  api_afspraken_item,
  api_afspraken_item_status,
  api_afspraken_item_type,
  api_vak_item,
  api_vestiging_item,
} from "../somtoday_api_types";
import Student from "./student";
import User from "../user";
import AppointmentType from "./appointmentType";
import { URLSearchParams } from "url";
import endpoints from "../endpoints";

export default class Appointment extends baseApiClass {
  public id!: number;
  public href!: string;
  public appointmentType!: AppointmentType;

  public startDateTime!: Date;
  public endDateTime!: Date;
  public startLessonHour!: number;
  public endLessonHour!: number;

  public title!: string;
  public description!: string;

  public attendanceRegistrationMandatory!: boolean;
  public attendanceRegistrationProcessed!: boolean;

  public appointmentStatus!: api_afspraken_item_status;

  public teacherAbbreviation?: string;
  public students?: Array<Student>;
  private _raw_course?: api_vak_item;
  private _course?: Course;

  public establishment!: Establishment;
  public attachments!: Array<Attachment>;

  public fetched: Promise<Appointment>;
  private _fetchedResolver!: (
    value: Appointment | PromiseLike<Appointment>,
  ) => void;
  private _fetchedRejecter!: (value?: Error | PromiseLike<Error>) => void;
  constructor(
    private _user: User,
    private _appointmentPartial: {
      id?: number;
      href?: string;
      raw?: api_afspraken_item;
    },
  ) {
    super(_user, {
      method: "get",
      baseURL: _user.baseURL,
      headers: {
        Authorization: `Bearer ${_user.accessToken}`,
      },
    });
    this.fetched = new Promise((resolve, reject) => {
      this._fetchedResolver = resolve;
      this._fetchedRejecter = reject;
    });

    if (_appointmentPartial.id) {
      this.id = _appointmentPartial.id;
      this.fetchAppointment().then((Appointment) => {
        this._fetchedResolver(Appointment);
      });
    } else if (_appointmentPartial.href) {
      this.call({
        baseURL: _appointmentPartial.href,
      })
        .then((response: api_afspraken) => {
          return this._storeAppointment(response.items[0]);
        })
        .then((appointment) => {
          this._fetchedResolver(appointment);
        });
    } else if (_appointmentPartial.raw) {
      this._fetchedResolver(this._storeAppointment(_appointmentPartial.raw));
    }
  }
  async fetchAppointment(): Promise<Appointment> {
    const params = new URLSearchParams();
    params.append("additional", "leerlingen");
    params.append("additional", "vak");
    params.append("additional", "docentAfkortingen");
    return this.call({
      url: endpoints.appointment + `/${this.id}`,
      params: params,
    }).then((response: api_afspraken_item) => {
      return this._storeAppointment(response);
    });
  }
  _storeAppointment(appointmentData: api_afspraken_item): Appointment {
    this.id = appointmentData.links[0].id;
    this.href = appointmentData.links[0].href!;
    this.appointmentType = new AppointmentType(this._user, {
      raw: appointmentData.afspraakType,
    });
    this.startDateTime = new Date(appointmentData.beginDatumTijd);
    this.endDateTime = new Date(appointmentData.eindDatumTijd);
    this.startLessonHour = appointmentData.beginLesuur;
    this.endLessonHour = appointmentData.eindLesuur;
    this.title = appointmentData.titel;
    this.description = appointmentData.omschrijving;
    this.attendanceRegistrationMandatory =
      appointmentData.presentieRegistratieVerplicht;
    this.attendanceRegistrationProcessed =
      appointmentData.presentieRegistratieVerwerkt;
    this.appointmentStatus = appointmentData.afspraakStatus;
    this.establishment = new Establishment(this._user, {
      raw: appointmentData.vestiging,
    });

    this.attachments = appointmentData.bijlagen.map(
      (attachment) => new Attachment(this._user, { raw: attachment }),
    );

    this.teacherAbbreviation =
      appointmentData.additionalObjects.docentAfkortingen;
    if (appointmentData.additionalObjects.vak) {
      this._raw_course = appointmentData.additionalObjects.vak;
    }
    if (appointmentData.additionalObjects.leerlingen) {
      this.students = appointmentData.additionalObjects.leerlingen?.items.map(
        (student) => {
          return new Student(this._user, {
            raw: student,
          });
        },
      );
    }
    return this;
  }

  get course(): Course | undefined {
    if (this._course) return this._course;
    else if (this._raw_course) {
      return (this._course = new Course(this._user, {
        raw: this._raw_course,
      }));
    } else {
      return undefined;
    }
  }

  toObject() {
    return {
      id: this.id,
      href: this.href,
      appointmentType: this.appointmentType.toObject(),

      startDateTime: this.startDateTime,
      endDateTime: this.endDateTime,
      startLessonHour: this.startLessonHour,
      endLessonHour: this.endLessonHour,

      title: this.title,
      description: this.description,

      attendanceRegistrationMandatory: this.attendanceRegistrationMandatory,
      attendanceRegistrationProcessed: this.attendanceRegistrationProcessed,

      appointmentStatus: this.appointmentStatus,

      teacherAbbreviation: this.teacherAbbreviation,
      students: this.students?.map((student) => student.toObject()),
      course: this.course?.toObject(),

      establishment: this.establishment.toObject(),
      attachments: this.attachments.map((attachment) => attachment.toObject()),
    };
  }
}
