import basename from 'basename';
import is_scalar from 'is-scalar';
import parse_url from 'parse_url';

import Ressource from './Ressource';
import ProjectAccess from './ProjectAccess';
import Environment from './Environment';
import Domain from './Domain';
import Integration from './Integration';
import ProjectLevelVariable from './ProjectLevelVariable';
import Activity from './Activity';

const paramDefaults = {};

export default class Project extends Ressource {
  constructor(project, url) {
    super(url, paramDefaults, {}, project);
    this.id = '';
    this.title = '';
    this.created_at = '';
    this.updated_at = '';
    this.owner = '';
    this.subscription = {};
    this.subscription_id = '';
  }

  static get(params, url) {
    return super.get(url, {}, paramDefaults, params);
  }

  /**
  * Get the subscription ID for the project.
  *
  * @todo when APIs are unified, this can be a property
  *
  * @return int
  */
  getSubscriptionId() {
    if (this.data.subscription_id) {
      return this.data.subscription_id;
    }
    if (this.data.subscription && this.data.subscription.license_uri) {
      return basename(this.data.subscription.license_uri);
    }
    throw new Error('Subscription ID not found');
  }

  /**
  * Get the Git URL for the project.
  *
  * @return string
  */
  getGitUrl() {
    // The collection doesn't provide a Git URL, but it does provide the
    // right host, so the URL can be calculated.
    if (!this.data.repository) {
      const parsedUrl = parse_url(this.getUri());

      return `${this.data.id}@git.${parsedUrl[3]}:${this.data.id}.git`;
    }

    return this.data.repository.url;
  }

  /**
  * Get the users associated with a project.
  *
  * @return ProjectAccess[]
  */
  getUsers() {
    return ProjectAccess.query(this.getLink('access'));
  }

  /**
  * Add a new user to a project.
  *
  * @param string $user   The user's UUID or email address (see $byUuid).
  * @param string $role   One of ProjectAccess::$roles.
  * @param bool   $byUuid Set true if $user is a UUID, or false (default) if
  *                       $user is an email address.
  *
  * Note that for legacy reasons, the default for $byUuid is false for
  * Project::addUser(), but true for Environment::addUser().
  *
  * @return Result
  */
  addUser(user, role, byUuid = false) {
    const property = byUuid ? 'user' : 'email';
    let body = { role };

    body[property] = user;
    const projectAccess = new ProjectAccess(body, this.getLink('access'));

    return projectAccess.save();
  }

  /**
  * Get a single environment of the project.
  *
  * @param string $id
  *
  * @return Environment|false
  */
  getEnvironment(id) {
    return Environment.get(id, this.getLink('environments'));
  }

  /**
  * @inheritdoc
  *
  * The accounts API does not (yet) return HAL links. This is a collection
  * of workarounds for that issue.
  */
  getLink(rel, absolute = true) {
    if (this.hasLink(rel)) {
      return super.getLink(rel, absolute);
    }
    if (rel === 'self') {
      return this.endpoint;
    }
    if (rel === '#ui') {
      return this.uri;
    }
    if (rel === '#manage-variables') {
      return `${this.getUri()}/variables`;
    }
    return `${this.getUri()}/${rel.trim().replace('#', '')}`;
  }

  /**
  * Get a list of environments for the project.
  *
  * @param int $limit
  *
  * @return Environment[]
  */
  getEnvironments(limit = 0) {
    return Environment.query({ limit }, this.getLink('environments'));
  }

  /**
  * Get a list of domains for the project.
  *
  * @param int $limit
  *
  * @return Domain[]
  */
  getDomains(limit = 0) {
    return Domain.query({ limit }, this.getLink('domains'));
  }

  /**
  * Get a single domain of the project.
  *
  * @param string $name
  *
  * @return Domain|false
  */
  getDomain(name) {
    return Domain.get({ name }, this.getLink('domains'));
  }

  /**
  * Add a domain to the project.
  *
  * @param string $name
  * @param array  $ssl
  *
  * @return Result
  */
  addDomain(name, ssl) {
    const body = { name };

    if (ssl.length) {
      body.ssl = ssl;
    }
    const domain = new Domain(body, this.getLink('domains'));

    return domain.save();
  }

  /**
  * Get a list of integrations for the project.
  *
  * @param int $limit
  *
  * @return Integration[]
  */
  getIntegrations(limit = 0) {
    return Integration.query({ limit }, this.getLink('integrations'));
  }

  /**
  * Get a single integration of the project.
  *
  * @param string $id
  *
  * @return Integration|false
  */
  getIntegration(id) {
    return Integration.get({ id }, this.getLink('integrations'));
  }

  /**
  * Add an integration to the project.
  *
  * @param string type
  * @param array data
  *
  * @return Result
  */
  addIntegration(type, data = []) {
    const body = { type, ...data };
    const integration = new Integration(body, this.getLink('integrations'));

    return integration.save();
  }

  /**
  * Get a single project activity.
  *
  * @param string id
  *
  * @return Activity|false
  */
  getActivity(id) {
    return Activity.get({ id }, `${this.getUri()}/activities`);
  }

  /**
  * Get a list of project activities.
  *
  * @param int limit
  *   Limit the number of activities to return.
  * @param string type
  *   Filter activities by type.
  * @param int startsAt
  *   A UNIX timestamp for the maximum created date of activities to return.
  *
  * @return Activity[]
  */
  getActivities(limit = 0, type, startsAt) {
    const params = { limit, type, starts_at: new Date(startsAt) };

    return Activity.query(params, `${this.getUri()}/activities`);
  }

  /**
  * Returns whether the project is suspended.
  *
  * @return bool
  */
  isSuspended() {
    return this.data.status
    ? this.data.status === 'suspended'
    : !!this.subscription.suspended;
  }

  /**
  * Get a list of variables.
  *
  * @param int limit
  *
  * @return ProjectLevelVariable[]
  */
  getVariables(limit = 0) {
    return ProjectLevelVariable.query({ limit }, this.getLink('#manage-variables'));
  }

  /**
  * Set a variable.
  *
  * @param string $name
  *   The name of the variable to set.
  * @param mixed  $value
  *   The value of the variable to set.  If non-scalar it will be JSON-encoded automatically.
  * @param bool $json
  *   True if this value is an encoded JSON value. false if it's a primitive.
  * @param bool $visibleBuild
  *   True if this variable should be exposed during the build phase, false otherwise.
  * @param bool $visibleRuntime
  *   True if this variable should be exposed during deploy and runtime, false otherwise.
  *
  * @return Result
  */
  setVariable(name, value, json = false, visibleBuild = true, visibleRuntime = true) {
    // If $value isn't a scalar, assume it's supposed to be JSON.
    if (!is_scalar(value)) {
      value = JSON.parse(value);
      json = true;
    }
    const values = {
      value,
      is_json: json,
      visible_build: visibleBuild,
      visible_runtime: visibleRuntime
    };
    const existing = this.getVariable(name);

    if (existing) {
      return existing.update(values);
    }
    values.name = name;
    const projectLevelVariable = new ProjectLevelVariable(values, this.getLink('#manage-variables'));

    return projectLevelVariable.save();
  }
}