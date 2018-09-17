/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import autobind from 'autobind-decorator';
import pt from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import * as priceActions from 'commerce/state/prices';
import {
  getActivePriceAlertForProduct,
  getLatestPriceForProduct,
  getOldestPriceForProduct,
  priceAlertShape,
  priceWrapperFromExtracted,
  priceWrapperShape,
} from 'commerce/state/prices';
import {extractedProductShape, productShape} from 'commerce/state/products';
import * as productActions from 'commerce/state/products';

import 'commerce/browser_action/components/ProductCard.css';

/**
 * Base component for showing info about a product.
 */
@autobind
export default class ProductCard extends React.Component {
  static propTypes = {
    // Direct props

    /** If provided, displays a button in the card with the given text */
    buttonText: pt.string,

    /** URL to an image of the product to show */
    imageUrl: pt.string.isRequired,

    /** Latest fetched price for the product */
    latestPrice: priceWrapperShape,

    /** Function to run when the button is clicked, if it is shown */
    onClickButton: pt.func,

    /** Function to run when the close button is clicked, if it is shown */
    onClickClose: pt.func,

    /** Function to run when the info block is clicked */
    onClickInfo: pt.func,

    /** Function to run when the undo button is clicked, if it is shown */
    onClickUndo: pt.func,

    /** The price of the product when it was first tracked. */
    originalPrice: priceWrapperShape.isRequired,

    /**
     * If true, show a close icon on hover in the top right corner.
     * Will not be shown if latestPrice is not provided.
     */
    showClose: pt.bool,

    /**
     * If true, show an undo icon in the top right corner.
     * Will not be shown unless the close icon is clicked.
     */
    showUndo: pt.bool,

    /** Title of the product */
    title: pt.string.isRequired,
  }

  static defaultProps = {
    buttonText: null,
    latestPrice: null,
    onClickButton: () => {},
    onClickClose: () => {},
    onClickInfo: () => {},
    onClickUndo: () => {},
    showClose: false,
    showUndo: false,
  }

  handleClickButton(event) {
    this.props.onClickButton(event);
  }

  handleClickClose(event) {
    this.props.onClickClose(event);
  }

  handleClickUndo(event) {
    this.props.onClickUndo(event);
  }

  handleClickInfo(event) {
    this.props.onClickInfo(event);
  }

  render() {
    const {
      buttonText,
      imageUrl,
      latestPrice,
      originalPrice,
      showClose,
      showUndo,
      title,
    } = this.props;

    return (
      <div className={showUndo ? 'product-card disabled' : 'product-card'}>
        {latestPrice && (
          <div className="latest-price">
            {latestPrice.amount.toFormat('$0.00')}
            {showUndo && (
              <button className="undo-button" type="button" onClick={this.handleClickUndo}>
                <img
                  alt="Keep tracking product"
                  className="undo-icon"
                  src={browser.extension.getURL('/img/undo.svg')}
                />
                Undo Delete
              </button>
            )}
            {(showClose && !showUndo) && (
              <button className="close-button" type="button" onClick={this.handleClickClose}>
                <img
                  alt="Stop tracking product"
                  className="close-icon"
                  src={browser.extension.getURL('/img/close.svg')}
                />
              </button>
            )}
          </div>
        )}
        <div className="product-info" onClick={this.handleClickInfo}>
          <img className="image" src={imageUrl} alt={title} />
          <h3 className="title">{title}</h3>
          <div className="vendor">
            Placeholder &middot; was {originalPrice.amount.toFormat('$0.00')}
          </div>
        </div>
        {buttonText && (
          <button className="button" type="button" onClick={this.handleClickButton}>
            {buttonText}
          </button>
        )}
        {showUndo && (
          <div className="opaque-overlay" />
        )}
      </div>
    );
  }
}


/**
 * Shows details about a single tracked product in the product listing.
 */
@connect(
  (state, props) => ({
    latestPrice: getLatestPriceForProduct(state, props.product.id),
    originalPrice: getOldestPriceForProduct(state, props.product.id),
    priceAlert: getActivePriceAlertForProduct(state, props.product.id),
  }),
  {
    deactivateAlert: priceActions.deactivateAlert,
    setDeletionFlag: productActions.setDeletionFlag,
  },
)
@autobind
export class TrackedProductCard extends React.Component {
  static propTypes = {
    // Direct props
    product: productShape.isRequired,

    // State props
    latestPrice: priceWrapperShape.isRequired,
    originalPrice: priceWrapperShape.isRequired,
    priceAlert: priceAlertShape,

    // Dispatch props
    deactivateAlert: pt.func.isRequired,
    setDeletionFlag: pt.func.isRequired,
  }

  static defaultProps = {
    priceAlert: null,
  }

  /**
   * Mark product as deleted when the close button is clicked
   */
  handleClickClose() {
    const deletionFlag = true;
    this.props.setDeletionFlag(this.props.product.id, deletionFlag);
  }

  /**
   * Mark product as undeleted when the undo button is clicked
   */
  handleClickUndo() {
    const deletionFlag = false;
    this.props.setDeletionFlag(this.props.product.id, deletionFlag);
  }

  /**
   * Open the product page when the product info is clicked,
   */
  handleClickInfo() {
    const {deactivateAlert, priceAlert, product} = this.props;
    if (priceAlert) {
      deactivateAlert(priceAlert);
    }

    browser.tabs.create({url: product.url});
  }

  render() {
    const {latestPrice, originalPrice, product, ...props} = this.props;
    return (
      <ProductCard
        imageUrl={product.image}
        latestPrice={latestPrice}
        onClickClose={this.handleClickClose}
        onClickUndo={this.handleClickUndo}
        originalPrice={originalPrice}
        showClose
        showUndo={product.isDeleted}
        title={product.title}
        onClickInfo={this.handleClickInfo}
        {...props}
      />
    );
  }
}

/**
 * Shows details about a product detected on the current page.
 */
@connect(null, {
  addProductFromExtracted: productActions.addProductFromExtracted,
})
@autobind
export class ExtractedProductCard extends React.Component {
  static propTypes = {
    // Direct props
    extractedProduct: extractedProductShape.isRequired,

    // Dispatch props
    addProductFromExtracted: pt.func.isRequired,
  }

  handleClickTrack() {
    this.props.addProductFromExtracted(this.props.extractedProduct);
  }

  render() {
    const {extractedProduct, ...props} = this.props;
    const price = priceWrapperFromExtracted(extractedProduct);
    return (
      <ProductCard
        buttonText="Track This Item"
        imageUrl={extractedProduct.image}
        onClickButton={this.handleClickTrack}
        originalPrice={price}
        title={extractedProduct.title}
        {...props}
      />
    );
  }
}
