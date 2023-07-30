/* eslint-disable */
import { Methods } from './methods';
import { WebAPICallOptions, WebAPICallResult } from './WebClient'

const DEFAULT_RETRIES = 3;

const queryEncode: Function = (params: Record<string, any>) => {
  const param_list: any[] = []
  for (const key in params) {
    let param: any = params[key]
    if (param === null) continue
    if (Array.isArray(param)) param = param.join(',')
    else if (typeof param == 'object') param = JSON.stringify(param)
    param_list.push(`${key}=${param}`)
  }
  return param_list.join('&')
}
const createPayload: Function = (params: Record<string, any>) => {
  const payload = { ...params }
  for (const key in payload) {
    const param: any = payload[key]
    if (param == null) delete payload[key]
    else if (typeof param !== 'string') payload[key] = JSON.stringify(param)
  }
  return payload
}




export class GasWebClient extends Methods {
  public filesUploadV2(options?: WebAPICallOptions | undefined): Promise<WebAPICallResult> {
    throw new Error('Method not implemented.');
  }
  private API_ENDPOINT = 'https://slack.com/api/'
  public readonly slackApiUrl: string;
  public readonly token?: string;
  private _retries_limit: number;

  constructor(token?: string, {
    slackApiUrl = 'https://slack.com/api/'
  } = {}) {
    super();
    this.token = token;
    this.slackApiUrl = slackApiUrl;
    this._retries_limit = DEFAULT_RETRIES
  }
  public apiCall(method: string, options?: WebAPICallOptions): any {
    const response = this.makeRequest(method, {
      token: this.token,
      ...options
    });
    return response;
  }
  private makeRequest(url: string, body: any) {
    const response = this._post(url, body);
    return JSON.parse(response.getContentText());
  }
  protected _get(api: string, args: Record<string, any> = {}): any {
    // https://github.com/requests/requests/blob/master/requests/models.py
    const encodedArgs: string = queryEncode({ token: this.token, ...args })
    const url = `${this.API_ENDPOINT}${api}?${encodedArgs}`
    const params: Record<string, any> = {
      method: 'get',
      contentType: 'application/x-www-form-urlencoded; charset=UTF-8'
    }
    return this._fetch(url, params)
  }

  protected _post(api: string, args: Record<string, any> = {}): GoogleAppsScript.URL_Fetch.HTTPResponse {
    const payload: Record<string, any> = createPayload({ ...args })
    const url = `${this.API_ENDPOINT}${api}`
    const params: Record<string, any> = {
      headers: { Authorization: `Bearer ${this.token}` },
      method: 'post',
      payload: payload
    }
    return this._fetch(url, params)
  }

  protected _fetch(url: string, params: Record<string, any> = {}): GoogleAppsScript.URL_Fetch.HTTPResponse {
    let response: any = null
    for (let retry = 0; retry < this._retries_limit; retry++) {
      try {
        response = UrlFetchApp.fetch(url, params)
      } catch (e) {
        throw e
      }
      // handle HTTP 429 as documented at
      // https://api.slack.com/docs/rate-limits
      if (response.getResponseCode() === 429) {
        Utilities.sleep(parseInt(response.getHeaders()['retry-after']))
        continue
      }
      return response
    }
    throw Error('Try limit over')
  }
}
