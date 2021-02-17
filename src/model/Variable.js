import Ressource from "./Ressource";
import Result from "./Result";
import { getConfig } from "../config";

const paramDefaults = {};
const creatableField = [
  "name",
  "value",
  "is_json",
  "is_sensitive",
  "is_inheritable",
  "is_enabled"
];
const modifialbleField = [
  "value",
  "is_json",
  "is_sensitive",
  "is_inheritable",
  "is_enabled"
];
const _url = "/projects/:projectId/environments/:environmentId/variables";

export default class Variable extends Ressource {
  constructor(variable, url, params, config) {
    super(
      url,
      paramDefaults,
      {},
      variable,
      creatableField,
      modifialbleField,
      config
    );
    this.id = "";
    this.name = "";
    this.project = "";
    this.environment = "";
    this.value = "";
    this.is_enabled = false;
    this.created_at = "";
    this.updated_at = "";
    this.inherited = false;
    this.is_json = "";
    this.is_sensitive = "";
    this.is_inheritable = true;
  }

  static get(params, customUrl, config) {
    const { projectId, environmentId, id, ...queryParams } = params;
    const urlToCall = customUrl || `:api_url${_url}`;

    return super.get(
      `${urlToCall}/:id`,
      { id },
      super.getConfig(config),
      queryParams
    );
  }

  static query(params, customUrl, config) {
    const { projectId, environmentId, ...queryParams } = params;

    return super.query(
      customUrl || `:api_url${_url}`,
      { projectId, environmentId },
      super.getConfig(config),
      queryParams
    );
  }

  /**
   * Disable the variable.
   *
   * This is only useful if the variable is both inherited and enabled.
   * Non-inherited variables can be deleted.
   *
   * @return Result
   */
  disable() {
    if (!this.is_enabled) {
      return new Result(
        {},
        this._url,
        this.prototype.constructor,
        this.getConfig()
      );
    }
    return this.update({ is_enabled: false });
  }
}
