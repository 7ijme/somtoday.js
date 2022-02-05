import Attachment from "./attachment";
import baseApiClass from "../baseApiClass";
import ExternalMaterial from "./externalMaterial";
import {
  api_bijlage_item,
  api_externeMaterialen_item,
  api_huiswerkType,
  api_inlevermomenten_item,
  api_studiewijzerItem_item,
} from "../somtoday_api_types";
import SubmissionTime from "./submissionTime";
import User from "../user";

export default class StudyGuideItem extends baseApiClass {
  public id!: number;
  public href!: string;
  public topic!: string;
  public homeworkType!: api_huiswerkType;
  public description!: string;

  public submissionPeriods!: boolean;
  public teachingMaterials!: boolean; //TODO: translate this better
  public projectGroups!: boolean;

  private _raw_attachments!: Array<api_bijlage_item>;
  private _raw_externalMaterials!: Array<api_externeMaterialen_item>;
  private _raw_submissionTimes!: Array<api_inlevermomenten_item>;

  public show!: boolean;
  public note?: string;
  public noteVisibleForStudents!: boolean;

  public fetched: Promise<StudyGuideItem>;
  private _fetchedResolver!: (
    value: StudyGuideItem | PromiseLike<StudyGuideItem>,
  ) => void;
  private _fetchedRejecter!: (value?: Error | PromiseLike<Error>) => void;
  constructor(
    private _user: User,
    _Partial: {
      id?: number;
      href?: string;
      raw?: api_studiewijzerItem_item;
    },
  ) {
    super(_user, {
      method: "get",
      baseURL: `${_user.baseURL}/studiewijzeritems`,
      headers: { Authorization: `Bearer ${_user.accessToken}` },
    });
    this.fetched = new Promise((resolve, reject) => {
      this._fetchedResolver = resolve;
      this._fetchedRejecter = reject;
    });

    if (_Partial.id) {
      this.id = _Partial.id;
      this.fetchStudyGuideItem().then((classs) => {
        this._fetchedResolver(classs);
      });
    } else if (_Partial.href) {
      this.href = _Partial.href;
      this.call({ baseURL: this.href }).then(
        (raw: api_studiewijzerItem_item) => {
          this._fetchedResolver(this._storeStudyGuideItem(raw));
        },
      );
    } else if (_Partial.raw) {
      this._fetchedResolver(this._storeStudyGuideItem(_Partial.raw));
    } else throw new Error("You must provide a StudyGuideItem Partial");
  }
  public async fetchStudyGuideItem(): Promise<StudyGuideItem> {
    const data = await this.call({ url: `${this.id}` });
    return this._storeStudyGuideItem(data);
  }
  private _storeStudyGuideItem(raw: api_studiewijzerItem_item): StudyGuideItem {
    this.id = raw.links[0].id;
    this.href = raw.links[0].href;
    this.topic = raw.onderwerp; // TODO: rename more of these
    this.homeworkType = raw.huiswerkType;
    this.description = raw.omschrijving;
    this.submissionPeriods = raw.inleverperiodes;
    this.teachingMaterials = raw.lesmateriaal;
    this.projectGroups = raw.projectgroepen;
    this.show = raw.tonen;
    this.note = raw.notitie;
    this.noteVisibleForStudents = raw.notitieZichtbaarVoorLeerling;

    this._raw_attachments = raw.bijlagen;
    this._raw_externalMaterials = raw.externeMaterialen;
    this._raw_submissionTimes = raw.inlevermomenten;
    return this;
  }

  get attachments(): Array<Attachment> {
    return this._raw_attachments.map(
      (attachment) => new Attachment(this._user, { raw: attachment }),
    );
  }
  get externalMaterials(): Array<ExternalMaterial> {
    return this._raw_externalMaterials.map(
      (externalMaterial) =>
        new ExternalMaterial(this._user, { raw: externalMaterial }),
    );
  }
  get submissionTimes(): Array<SubmissionTime> {
    return this._raw_submissionTimes.map(
      (submissionTime) =>
        new SubmissionTime(this._user, { raw: submissionTime }),
    );
  }

  toObject() {
    return {
      id: this.id,
      href: this.href,
      topic: this.topic,
      homeworkType: this.homeworkType,
      description: this.description,
      submissionPeriods: this.submissionPeriods,
      teachingMaterials: this.teachingMaterials,
      projectGroups: this.projectGroups,
      show: this.show,
      note: this.note,
      noteVisibleForStudents: this.noteVisibleForStudents,
      attachments: this.attachments.map((a) => a.toObject()),
      externalMaterials: this.externalMaterials.map((a) => a.toObject()),
      submissionTimes: this.submissionTimes.map((a) => a.toObject()),
    };
  }
}
